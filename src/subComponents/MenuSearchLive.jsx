import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

function formatPriceUYU(value) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n);
}

function buildCategoryMaps(categories = []) {
  const catMap = new Map(); // categoryId/slug -> nombre
  const subMap = new Map(); // `${catId}::${subId}` -> subNombre

  categories.forEach((c) => {
    if (!c) return;

    if (c.id) catMap.set(c.id, c.nombre);
    if (c.slug) catMap.set(c.slug, c.nombre);

    (c.subcategorias || []).forEach((s) => {
      if (!s) return;
      const key = `${c.id || c.slug}::${s.id || s.slug}`;
      subMap.set(key, s.nombre);
    });
  });

  return { catMap, subMap };
}

function resolveCategoryLine(p, maps) {
  const catId = p.categoryId;
  const subId = p.subCategoryId;

  const catName = maps.catMap.get(catId) || catId || "";
  const subKey = `${catId}::${subId}`;
  const subName = maps.subMap.get(subKey) || subId || "";

  return subName ? `${catName} / ${subName}` : catName;
}

function resolveCoverUrl(cover) {
  if (!cover) return null;
  if (typeof cover !== "string") return null;

  // si viene URL completa (como picsum), usar tal cual
  if (cover.startsWith("http://") || cover.startsWith("https://")) return cover;

  // si te viene algo tipo "uploads/..." o "/uploads/..."
  const clean = cover.startsWith("/") ? cover.slice(1) : cover;
  return `${API_BASE_URL}/${clean}`;
}

export default function MenuSearchLive({
  isActive,
  categories = [],
  onPickProduct, // (product, meta) => {}
  onSeeAll, // (query) => {}
  minChars = 2,
  debounceMs = 250,
  limit = 8,
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle"); // idle|loading|ok|empty|error
  const [errorMsg, setErrorMsg] = useState("");
  const location = useLocation();
  

  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const maps = useMemo(() => buildCategoryMaps(categories), [categories]);

  const query = q.trim();
  const canSearch = query.length >= minChars;

  useEffect(() => {
    if (!isActive) {
      // al salir del panel: cortar requests y resetear estado visual
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      setItems([]);
      setStatus("idle");
      setErrorMsg("");
      return;
    }

    if (!canSearch) {
      setItems([]);
      setStatus(query.length === 0 ? "idle" : "empty");
      setErrorMsg("");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const url = `${API_BASE_URL}${API_PREFIX}/products/search?q=${encodeURIComponent(
          query
        )}&limit=${limit}`;

        const res = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("No se pudieron obtener resultados");

        // tu endpoint devuelve array directo ✅
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        setItems(list);
        setStatus(list.length ? "ok" : "empty");
      } catch (err) {
        if (err?.name === "AbortError") return;
        setItems([]);
        setStatus("error");
        setErrorMsg(err?.message || "Error buscando productos");
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isActive, canSearch, debounceMs, limit]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (query) onSeeAll?.(query);
    }
    if (e.key === "Escape") {
      setQ("");
    }
  };

  return (
    <div className="msearch">
      {/* Barra */}
      <div className="msearch__bar">
        <i className="bi bi-search" />
        <input
          className="msearch__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar productos…"
          autoFocus={isActive}
        />

        {q.length > 0 && (
          <button
            className="msearch__clear"
            type="button"
            onClick={() => setQ("")}
            aria-label="Limpiar"
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>

      {/* Estado */}
      <div className="msearch__meta">
        {status === "idle" && <span>Escribí para buscar.</span>}
        {status === "loading" && <span>Buscando…</span>}
        {status === "empty" && query.length > 0 && !canSearch && (
          <span>Ingresá al menos {minChars} caracteres.</span>
        )}
        {status === "empty" && canSearch && (
          <span>No encontré resultados.</span>
        )}
        {status === "error" && (
          <span className="msearch__error">{errorMsg}</span>
        )}
      </div>

      {/* Lista */}
      {items.length > 0 && (
        <div className="msearch__list">
          {items.map((p) => {
            const name = `${p.brand} ${p.model}`.trim();
            const categoryLine = resolveCategoryLine(p, maps);
            const coverUrl = resolveCoverUrl(p.cover);
            const discount = Number(p.discount_percentaje || 0);
            const hasDiscount = discount > 0;
            const basePrice = Number(p.price ?? 0);
            const finalPrice = hasDiscount
              ? Math.round(basePrice * (1 - discount / 100))
              : basePrice;
            const isOut =
              (typeof p.stock === "number" && p.stock <= 0) ||
              p.active === false;

            return (
              <button
                key={p._id}
                className={`msearch__item ${isOut ? "msearch__item--out" : ""}`}
                type="button"
                onClick={() => onPickProduct?.(p, {q: query})}
                disabled={isOut}
              >
                {/* ✅ AGOTADO fuera del contenedor de la foto */}
                {isOut && <span className="msearch__ribbon">AGOTADO</span>}

                <div className="msearch__thumb">
                  {isOut ? (
                    /* ✅ espacio reservado pero “invisible” (blanco como el fondo) */
                    <div className="msearch__thumb-empty" aria-hidden="true" />
                  ) : coverUrl ? (
                    <img src={coverUrl} alt={name} />
                  ) : (
                    <div className="msearch__thumb--ph" aria-hidden="true">
                      <i className="bi bi-image" />
                    </div>
                  )}
                </div>

                <div className="msearch__mid">
                  <div className="msearch__name">{name}</div>
                  <div className="msearch__cat">{categoryLine}</div>
                </div>

                <div className="msearch__right">
                  {hasDiscount && (
                    <span className="msearch__discount">-{discount}% OFF</span>
                  )}

                  {hasDiscount ? (
                    <div className="msearch__prices">
                      <div className="msearch__price-old">
                        {formatPriceUYU(basePrice)}
                      </div>
                      <div className="msearch__price-final msearch__price-final--blink">
                        {formatPriceUYU(finalPrice)}
                      </div>
                    </div>
                  ) : (
                    <div className="msearch__price">
                      {formatPriceUYU(basePrice)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          <button
            type="button"
            className="msearch__seeall"
            onClick={() => onSeeAll?.(query)}
            disabled={!canSearch}
          >
            Ver todos los resultados <i className="bi bi-arrow-right" />
          </button>
        </div>
      )}

      {/* Sin items pero con query válida: igual mostramos “ver todos” */}
      {items.length === 0 && canSearch && status !== "loading" && (
        <button
          type="button"
          className="msearch__seeall"
          onClick={() => onSeeAll?.(query)}
        >
          Ver todos los resultados <i className="bi bi-arrow-right" />
        </button>
      )}
    </div>
  );
}
