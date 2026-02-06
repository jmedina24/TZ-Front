// src/pages/MyPurchasesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import "../css/checkoutPage.css";
import "../css/myPurchasesPage.css";
import StickyActions from "../subComponents/StickyActions";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const money = (n) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const shortId = (id) => String(id || "").slice(-8).toUpperCase();

const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-UY");
  } catch {
    return "—";
  }
};

const toDateInputValue = (d) => {
  // d: Date or string
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
};

function lockBodyScroll(lock) {
  const body = document.body;
  if (!body) return;
  if (lock) {
    body.dataset.prevOverflow = body.style.overflow || "";
    body.style.overflow = "hidden";
  } else {
    body.style.overflow = body.dataset.prevOverflow || "";
    delete body.dataset.prevOverflow;
  }
}

export default function MyPurchasesPage() {
  const navigate = useNavigate();
  const { token, showToast } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState(null);

  const [downloadingId, setDownloadingId] = useState(null);
  const [emailingId, setEmailingId] = useState(null);

  // ===== Filters =====
  const [filtersOpen, setFiltersOpen] = useState(false);

  // filtros aplicados (los que realmente filtran la lista)
  const [filters, setFilters] = useState({
    from: "", // YYYY-MM-DD
    to: "", // YYYY-MM-DD
    status: "all",
    method: "all",
  });

  // filtros “draft” dentro del modal
  const [draft, setDraft] = useState(filters);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : null),
    [token]
  );

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        setPurchases([]);
        setError("Iniciá sesión para ver tus compras.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/purchase/history`, {
          method: "GET",
          headers: authHeaders,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.msg || "No se pudo cargar el historial.");

        const list = Array.isArray(data?.purchases) ? data.purchases : [];
        setPurchases(list);
      } catch (e) {
        setError(e?.message || "Error cargando compras");
        setPurchases([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, authHeaders]);

  // ===== options dinámicas =====
  const statusOptions = useMemo(() => {
    const set = new Set();
    purchases.forEach((p) => {
      const s = String(p?.status || "").trim();
      if (s) set.add(s);
    });
    return ["all", ...Array.from(set)];
  }, [purchases]);

  const methodOptions = useMemo(() => {
    const set = new Set();
    purchases.forEach((p) => {
      const m = String(p?.paymentMethod || "").trim();
      if (m) set.add(m);
    });
    return ["all", ...Array.from(set)];
  }, [purchases]);

  // ===== filtering combinable =====
  const filteredPurchases = useMemo(() => {
    let list = [...purchases];

    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;

    if (from && !Number.isNaN(from.getTime())) {
      list = list.filter((p) => {
        const d = new Date(p?.createdAt || 0);
        return !Number.isNaN(d.getTime()) && d >= from;
      });
    }

    if (to && !Number.isNaN(to.getTime())) {
      list = list.filter((p) => {
        const d = new Date(p?.createdAt || 0);
        return !Number.isNaN(d.getTime()) && d <= to;
      });
    }

    if (filters.status !== "all") {
      list = list.filter((p) => String(p?.status || "") === String(filters.status));
    }

    if (filters.method !== "all") {
      list = list.filter((p) => String(p?.paymentMethod || "") === String(filters.method));
    }

    // orden: más reciente primero
    list.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));

    return list;
  }, [purchases, filters]);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(filters.from) ||
      Boolean(filters.to) ||
      filters.status !== "all" ||
      filters.method !== "all"
    );
  }, [filters]);

  // ===== modal behaviors =====
  useEffect(() => {
    lockBodyScroll(filtersOpen);
    return () => lockBodyScroll(false);
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);

  const openFilters = () => {
    setDraft(filters);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    // validación fechas
    if (draft.from && draft.to) {
      const a = new Date(`${draft.from}T00:00:00`).getTime();
      const b = new Date(`${draft.to}T00:00:00`).getTime();
      if (!Number.isNaN(a) && !Number.isNaN(b) && a > b) {
        showToast?.("La fecha 'desde' no puede ser mayor a 'hasta'.", "warning");
        return;
      }
    }

    setFilters(draft);
    setFiltersOpen(false);
    showToast?.("Filtros aplicados ✅", "success");
  };

  const clearFilters = () => {
    const cleared = { from: "", to: "", status: "all", method: "all" };
    setDraft(cleared);
    setFilters(cleared);
    showToast?.("Filtros limpiados ✅", "success");
  };

  const clearOne = (key) => {
    const next = { ...filters };
    if (key === "from") next.from = "";
    if (key === "to") next.to = "";
    if (key === "status") next.status = "all";
    if (key === "method") next.method = "all";
    setFilters(next);
  };

  // ===== invoices =====
  const handleDownloadInvoice = async (purchaseId) => {
    if (!token || !purchaseId) return;

    setDownloadingId(purchaseId);
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/purchase/${purchaseId}/invoice`, {
        method: "GET",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.msg || "No se pudo generar la factura.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");

      showToast?.("✅ Factura generada", "success");
      setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      showToast?.(e?.message || "Error generando factura", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResendInvoiceEmail = async (purchaseId) => {
    if (!token || !purchaseId) return;

    setEmailingId(purchaseId);
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/purchase/${purchaseId}/invoice/email`, {
        method: "POST",
        headers: authHeaders,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.msg || "No se pudo enviar la factura.");

      showToast?.(data?.msg || "✅ Factura reenviada por email", "success");
    } catch (e) {
      showToast?.(e?.message || "Error enviando factura", "error");
    } finally {
      setEmailingId(null);
    }
  };

  if (loading) return null;

  return (
    <section className="coPage mpPage">
      <div className="coHead">
        <div className="mpHeadRow">
          <div>
            <h2 className="coHead__title">Mis compras</h2>
            <p className="coHead__sub">Historial de compras y facturas.</p>
            {error && <p className="coHead__error">{error}</p>}
          </div>

          {/* ✅ Botón filtros */}
          {token && purchases.length > 0 && (
            <button
              type="button"
              className={`mpFilterBtn ${hasActiveFilters ? "mpFilterBtn--on" : ""}`}
              onClick={openFilters}
              aria-label="Abrir filtros"
              title="Filtros"
            >
              <i className="bi bi-sliders" />
              <span>Filtros</span>
              {hasActiveFilters && <span className="mpDot" aria-hidden="true" />}
            </button>
          )}
        </div>

        {/* ✅ Chips filtros activos */}
        {token && hasActiveFilters && (
          <div className="mpChips" aria-label="Filtros activos">
            {filters.from && (
              <button className="mpChip" type="button" onClick={() => clearOne("from")}>
                Desde: {filters.from} <i className="bi bi-x" />
              </button>
            )}
            {filters.to && (
              <button className="mpChip" type="button" onClick={() => clearOne("to")}>
                Hasta: {filters.to} <i className="bi bi-x" />
              </button>
            )}
            {filters.status !== "all" && (
              <button className="mpChip" type="button" onClick={() => clearOne("status")}>
                Estado: {filters.status} <i className="bi bi-x" />
              </button>
            )}
            {filters.method !== "all" && (
              <button className="mpChip" type="button" onClick={() => clearOne("method")}>
                Pago: {filters.method} <i className="bi bi-x" />
              </button>
            )}

            <button className="mpChip mpChip--clear" type="button" onClick={clearFilters}>
              Limpiar <i className="bi bi-trash3" />
            </button>
          </div>
        )}
      </div>

      {/* LISTA VACÍA */}
      {token && purchases.length === 0 && !error && (
        <div className="coCard">
          <h3 className="coCard__title coCard__title--bar">Sin compras</h3>

          <div className="coBreakdown">
            <div className="coRow">
              <span>Aún no tenés compras registradas.</span>
              <span />
            </div>
          </div>

          <div className="coActions">
            <button className="coBtn coBtn--primary" onClick={() => navigate("/")}>
              Ir al inicio
            </button>
          </div>
        </div>
      )}

      {/* ✅ Sin resultados por filtros */}
      {token && purchases.length > 0 && filteredPurchases.length === 0 && !error && (
        <div className="coCard">
          <h3 className="coCard__title coCard__title--bar">Sin resultados</h3>
          <div className="coBreakdown">
            <div className="coRow">
              <span>No hay compras que coincidan con los filtros.</span>
              <span />
            </div>
          </div>
          <div className="coActions">
            <button className="coBtn coBtn--primary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {filteredPurchases.map((p) => {
        const id = p?._id;
        const total = Number(p?.total) || 0;
        const status = p?.status || "—";
        const method = p?.paymentMethod || "—";
        const created = fmtDateTime(p?.createdAt);

        return (
          <div key={id} className="coCard">
            <h3 className="coCard__title coCard__title--bar">Compra #{shortId(id)}</h3>

            <div className="coBreakdown">
              <div className="coRow">
                <span>Fecha y hora</span>
                <span>{created}</span>
              </div>

              <div className="coRow">
                <span>Estado</span>
                <span>{status}</span>
              </div>

              <div className="coRow">
                <span>Medio de pago</span>
                <span>{method}</span>
              </div>

              <div className="coTotalRow">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            <button className="coActionLink" onClick={() => navigate(`/mis-compras/${id}`)}>
              <i className="bi bi-receipt" />
              Ver detalle
            </button>

            <button
              className="coActionLink"
              onClick={() => handleDownloadInvoice(id)}
              disabled={downloadingId === id}
            >
              <i className="bi bi-file-earmark-pdf" />
              {downloadingId === id ? "Generando factura..." : "Ver / descargar factura"}
            </button>

            <button
              className="coActionLink"
              onClick={() => handleResendInvoiceEmail(id)}
              disabled={emailingId === id}
            >
              <i className="bi bi-envelope" />
              {emailingId === id ? "Enviando..." : "Reenviar factura por email"}
            </button>
          </div>
        );
      })}

      {/* ===== Modal Filtros ===== */}
      {filtersOpen && (
        <div className="mpModalOverlay" role="dialog" aria-modal="true" onClick={() => setFiltersOpen(false)}>
          <div className="mpModal" onClick={(e) => e.stopPropagation()}>
            <div className="mpModalHead">
              <div className="mpModalTitle">
                <i className="bi bi-sliders" />
                Filtros
              </div>

              <button className="mpModalClose" type="button" onClick={() => setFiltersOpen(false)} aria-label="Cerrar">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="mpModalBody">
              <div className="mpFieldGrid">
                <div className="mpField">
                  <label className="mpLabel">Desde</label>
                  <input
                    className="mpInput"
                    type="date"
                    value={draft.from}
                    onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                    max={draft.to || undefined}
                  />
                </div>

                <div className="mpField">
                  <label className="mpLabel">Hasta</label>
                  <input
                    className="mpInput"
                    type="date"
                    value={draft.to}
                    onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                    min={draft.from || undefined}
                  />
                </div>
              </div>

              <div className="mpField">
                <label className="mpLabel">Estado</label>
                <select
                  className="mpSelect"
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "Todos" : s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mpField">
                <label className="mpLabel">Medio de pago</label>
                <select
                  className="mpSelect"
                  value={draft.method}
                  onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))}
                >
                  {methodOptions.map((m) => (
                    <option key={m} value={m}>
                      {m === "all" ? "Todos" : m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mpModalFoot">
              <button className="mpModalBtn mpModalBtn--ghost" type="button" onClick={clearFilters}>
                Limpiar
              </button>
              <button className="mpModalBtn mpModalBtn--primary" type="button" onClick={applyFilters}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Sticky (reutilizable) */}
      <StickyActions>
        <button className="mpBtn mpBtn--secondary" onClick={() => navigate(-1)}>
          Volver
        </button>

        <button className="mpBtn mpBtn--primary" onClick={() => navigate("/")}>
          Explorar productos
        </button>
      </StickyActions>
    </section>
  );
}
