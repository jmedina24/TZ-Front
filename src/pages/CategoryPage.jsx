// src/pages/CategoryPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useParams,
  useOutletContext,
  useLocation,
} from "react-router-dom";
import "../css/categoryPage.css";
import StickyActions from "../subComponents/StickyActions";
import ProductCard from "../subComponents/ProductCard";
import { cartService } from "../services/cartService";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const LS_CART_KEY = "tz_cart";

function getToken() {
  return localStorage.getItem("token");
}

function getAuthHeaders() {
  const token = getToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function readLocalCart() {
  try {
    const raw = localStorage.getItem(LS_CART_KEY);
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && x.productId)
      .map((x) => ({
        productId: String(x.productId),
        qty: Math.max(1, Number(x.qty || 1)),
      }));
  } catch {
    return [];
  }
}

function writeLocalCart(items) {
  localStorage.setItem(LS_CART_KEY, JSON.stringify(items || []));
}

function removeLocalItem(productId) {
  const pid = String(productId || "");
  const cart = readLocalCart();
  const next = cart.filter((x) => String(x.productId) !== pid);
  writeLocalCart(next);
  return next;
}

async function apiFetch(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.msg || "Error");
  return data;
}

function extractCartIds(data) {
  // posibles shapes:
  // { cart: [{productId, qty}] }
  // { cart: { items: [...] } }
  // { items: [...] }
  // array directo
  const arr =
    (Array.isArray(data?.cart) && data.cart) ||
    (Array.isArray(data?.cart?.items) && data.cart.items) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data) && data) ||
    [];

  const ids = arr
    .map((it) => it?.productId?._id || it?.productId || it?._id)
    .filter(Boolean)
    .map(String);

  return new Set(ids);
}

// ⚠️ fallback hasta que tengas endpoint definitivo de remove
async function removeFromServerCart(productId) {
  const pid = String(productId || "");

  const tries = [
    () => apiFetch(`/user/cart/${pid}`, { method: "DELETE" }),
    () => apiFetch(`/user/cart`, { method: "DELETE", body: { productId: pid } }),
    () => apiFetch(`/user/cart/remove`, { method: "POST", body: { productId: pid } }),
    () => apiFetch(`/user/cart/remove`, { method: "PUT", body: { productId: pid } }),
  ];

  let lastErr = null;
  for (const run of tries) {
    try {
      return await run();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No se pudo quitar del carrito");
}

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const outlet = useOutletContext?.() || {};
  const categories = outlet.categories || [];
  const showToast = outlet.showToast;

  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("relevance"); // relevance | newest | price_asc | price_desc

  // ✅ volver con estado (si venís desde ProductDetail)
  const from = location.state?.from || null;

  // ✅ evitar que sticky tape cards
  const stickyRef = useRef(null);
  const [stickyH, setStickyH] = useState(76);

  // ✅ favoritos / carrito
  const [favIds, setFavIds] = useState(() => new Set());
  const [cartIds, setCartIds] = useState(() => new Set());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [categoryId]);

  // medir sticky height
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setStickyH(Math.max(56, el.getBoundingClientRect().height || 0));
    });

    ro.observe(el);
    setStickyH(Math.max(56, el.getBoundingClientRect().height || 0));

    return () => ro.disconnect();
  }, []);

  const categoryName = useMemo(() => {
    const cat = (categories || []).find((c) => String(c.id) === String(categoryId));
    return cat?.nombre || "Categoría";
  }, [categories, categoryId]);

  // cargar productos
  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/product/get`);
        const data = await res.json().catch(() => []);

        if (!res.ok) throw new Error(data?.msg || "No se pudieron cargar productos.");

        const list = (Array.isArray(data) ? data : [])
          .filter((p) => p?.active !== false)
          .filter((p) => String(p?.categoryId) === String(categoryId));

        if (!alive) return;
        setAll(list);
      } catch (e) {
        console.error(e);
        if (typeof showToast === "function") showToast(e.message || "Error", "error");
        if (alive) setAll([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => { alive = false; };
  }, [categoryId, showToast]);

  // cargar favoritos
  useEffect(() => {
    let alive = true;

    async function loadFavs() {
      const headers = getAuthHeaders();
      if (!headers) {
        if (alive) setFavIds(new Set());
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/favorites`, {
          method: "GET",
          headers,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const favs = Array.isArray(data?.favorites) ? data.favorites : [];
        const ids = favs
          .map((f) => f?.productId?._id || f?.productId)
          .filter(Boolean)
          .map(String);

        if (alive) setFavIds(new Set(ids));
      } catch (e) {
        console.error(e);
      }
    }

    loadFavs();
    return () => { alive = false; };
  }, []);

  // cargar carrito inicial (server/local)
  useEffect(() => {
    let alive = true;

    async function loadCart() {
      const token = getToken();

      if (!token) {
        const local = readLocalCart();
        const ids = new Set(local.map((x) => String(x.productId)));
        if (alive) setCartIds(ids);
        return;
      }

      try {
        const data = await apiFetch("/user/cart", { method: "GET" });
        const ids = extractCartIds(data);
        if (alive) setCartIds(ids);
      } catch (e) {
        console.error(e);
        if (alive) setCartIds(new Set());
      }
    }

    loadCart();
    return () => { alive = false; };
  }, []);

  // helper labels categoría/subcategoría para búsqueda
  const getLabels = (p) => {
    const catId = p?.categoryId;
    const subId = p?.subCategoryId;

    let catName = "";
    let subName = "";

    if (catId) {
      const cat = (categories || []).find((c) => String(c.id) === String(catId));
      catName = (cat?.nombre || "").toLowerCase();

      if (subId && cat?.subcategorias) {
        const sub = (cat.subcategorias || []).find((s) => String(s.id) === String(subId));
        subName = (sub?.nombre || "").toLowerCase();
      }
    }

    // fallback: buscar sub en todas las categorías
    if (!subName && subId) {
      for (const c of categories || []) {
        const s = (c.subcategorias || []).find((x) => String(x.id) === String(subId));
        if (s) { subName = (s?.nombre || "").toLowerCase(); break; }
      }
    }

    return { catName, subName };
  };

  // filtrado + orden
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = [...all];

    if (term) {
      list = list.filter((p) => {
        const title = `${p?.brand || ""} ${p?.model || ""}`.toLowerCase();
        const desc = String(p?.description || "").toLowerCase();
        const { catName, subName } = getLabels(p);

        return (
          title.includes(term) ||
          desc.includes(term) ||
          catName.includes(term) ||
          subName.includes(term)
        );
      });
    }

    if (sort === "price_asc") {
      list.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
    } else if (sort === "price_desc") {
      list.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
    } else if (sort === "newest") {
      list.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, sort, categories]);

  const toast = (msg, type = "success") => {
    if (typeof showToast === "function") showToast(msg, type);
    else console.log(`[${type}] ${msg}`);
  };

  // ✅ handlers: carrito/fav
  const handleAddToCart = async (product) => {
    const pid = String(product?._id || "");
    if (!pid) return;

    try {
      await cartService.add(pid, 1);
      setCartIds((prev) => new Set(prev).add(pid));
      toast("Agregado al carrito ✅", "success");
    } catch (e) {
      toast(e?.message || "No se pudo agregar al carrito", "error");
    }
  };

  const handleRemoveFromCart = async (productId) => {
    const pid = String(productId || "");
    if (!pid) return;

    const token = getToken();

    try {
      if (!token) {
        removeLocalItem(pid);
        setCartIds((prev) => {
          const next = new Set(prev);
          next.delete(pid);
          return next;
        });
        toast("Quitado del carrito ✅", "success");
        return;
      }

      await removeFromServerCart(pid);

      setCartIds((prev) => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });

      toast("Quitado del carrito ✅", "success");
    } catch (e) {
      toast(e?.message || "No se pudo quitar del carrito", "error");
    }
  };

  const handleToggleFavorite = async (product) => {
    const pid = String(product?._id || "");
    if (!pid) return;

    const headers = getAuthHeaders();
    if (!headers) {
      toast("Iniciá sesión para usar favoritos", "warning");
      return;
    }

    const isFav = favIds.has(pid);

    try {
      if (!isFav) {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/favorites`, {
          method: "POST",
          headers,
          body: JSON.stringify({ productId: pid }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.msg || "No se pudo agregar a favoritos");

        setFavIds((prev) => new Set(prev).add(pid));
        toast("Añadido a favoritos ✅", "success");
      } else {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/favorites/${pid}`, {
          method: "DELETE",
          headers,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.msg || "No se pudo quitar de favoritos");

        setFavIds((prev) => {
          const next = new Set(prev);
          next.delete(pid);
          return next;
        });
        toast("Quitado de favoritos ✅", "success");
      }
    } catch (e) {
      toast(e?.message || "Error en favoritos", "error");
    }
  };

  const handleBack = () => {
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    if (window.history.length <= 1) {
      navigate("/");
      return;
    }
    navigate(-1);
  };

  return (
    <section className="cpPage" style={{ paddingBottom: stickyH + 18 }}>
      {/* ✅ Header TZ (sin botón volver arriba) */}
      <div className="cpWrap">
        <div className="cpHead">
          <div>
            <div className="cpEyebrow">Categoría</div>
            <h1 className="cpTitle">{categoryName}</h1>
            <div className="cpMeta">
              {loading ? "Cargando..." : `${filtered.length} producto(s)`}
            </div>
          </div>
        </div>

        {/* ✅ Controls en columna */}
        <div className="cpControls cpControls--col">
          <div className="cpSearch">
            <i className="bi bi-search" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en esta categoría"
            />
          </div>

          <select
            className="cpSelect"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="relevance">Relevancia</option>
            <option value="newest">Más nuevos</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="cpSkeletonGrid" aria-label="Cargando productos">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cpSkeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="cpEmpty">
            <h3 className="cpEmpty__title">No hay productos para mostrar</h3>
            <p className="cpEmpty__text">Probá cambiar la búsqueda o volver al inicio.</p>
            <button className="cpBtn cpBtn--primary" onClick={() => navigate("/")}>
              Volver al inicio
            </button>
          </div>
        ) : (
          <div className="cpGrid" aria-label="Listado de productos">
            {filtered.map((p) => {
              const pid = String(p?._id || "");
              return (
                <ProductCard
                  key={pid}
                  product={p}
                  categoryIndex={categories}
                  showCategory={false}
                  // ✅ favoritos
                  isFavorite={favIds.has(pid)}
                  onToggleFavorite={handleToggleFavorite}
                  // ✅ carrito
                  isInCart={cartIds.has(pid)}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={handleRemoveFromCart}
                  // ✅ navegación
                  onOpen={() => {
                    navigate(`/producto/${pid}`, {
                      state: { from: `/categorias/${categoryId}` },
                    });
                    window.scrollTo({ top: 0, behavior: "auto" });
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ Sticky bottom (TZ) */}
      <div ref={stickyRef}>
        <StickyActions>
          <button className="cpStickyBtn cpStickyBtn--secondary" onClick={handleBack}>
            Volver
          </button>

          <button className="cpStickyBtn cpStickyBtn--primary" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </StickyActions>
      </div>
    </section>
  );
}
