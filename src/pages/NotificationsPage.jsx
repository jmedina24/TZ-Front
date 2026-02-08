// src/pages/NotificationsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import "../css/notificationsPage.css";
import StickyActions from "../subComponents/StickyActions";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";
const PAGE_SIZE = 15;

const fmtDateTime = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("es-UY"); } catch { return "—"; }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { token, showToast } = useOutletContext();

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : null),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState(null);

  const fetchList = async (p = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_PREFIX}/notifications?page=${p}&limit=${PAGE_SIZE}`,
        { method: "GET", headers: authHeaders }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.msg || "No se pudieron cargar las notificaciones.");

      setItems(Array.isArray(data.items) ? data.items : []);
      setPage(Number(data.page) || 1);
      setTotalPages(Number(data.totalPages) || 1);
      setTotalItems(Number(data.totalItems) || 0);
    } catch (e) {
      showToast?.(e?.message || "Error", "error");
      setItems([]);
      setPage(1);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setItems([]);
      return;
    }
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const markAsRead = async (id) => {
    if (!token || !id) return;
    try {
      await fetch(`${API_BASE_URL}${API_PREFIX}/notifications/${id}/read`, {
        method: "PUT",
        headers: authHeaders,
      });
      // actualizar item local
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch {
      // silencioso
    }
  };

  const openModal = async (n) => {
    setActive(n);
    setModalOpen(true);
    if (!n?.readAt) await markAsRead(n._id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActive(null);
  };

  const markAll = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/notifications/read-all`, {
        method: "PUT",
        headers: authHeaders,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.msg || "No se pudo.");
      }
      showToast?.("Notificaciones marcadas como leídas ✅", "success");
      // refrescar página actual
      fetchList(page);
    } catch (e) {
      showToast?.(e?.message || "Error", "error");
    }
  };

  const goToTarget = () => {
    const n = active;
    if (!n) return;

    const meta = n?.meta || {};
    // navegación según tipo
    if (meta.purchaseId) {
      closeModal();
      navigate(`/mis-compras/${meta.purchaseId}`);
      return;
    }
    if (meta.productId) {
      closeModal();
      navigate(`/producto/${meta.productId}`);
      return;
    }
    closeModal();
  };

  if (!token && !loading) {
    return (
      <section className="npPage">
        <div className="npHead">
          <h2 className="npTitle">Notificaciones</h2>
          <p className="npSub">Iniciá sesión para ver tus notificaciones.</p>
        </div>

        <StickyActions>
          <button className="npBtn npBtn--secondary" onClick={() => navigate(-1)}>Volver</button>
          <button className="npBtn npBtn--primary" onClick={() => navigate("/")}>Explorar productos</button>
        </StickyActions>
      </section>
    );
  }

  if (loading) return null;

  return (
    <section className="npPage">
      <div className="npHead">
        <div>
          <h2 className="npTitle">Notificaciones</h2>
          <p className="npSub">{totalItems} en total</p>
        </div>

        <button className="npMarkAll" type="button" onClick={markAll} disabled={items.length === 0}>
          <i className="bi bi-check2-all" />
          Marcar todas como leídas
        </button>
      </div>

      {items.length === 0 ? (
        <div className="npEmpty">
          <h3 className="npEmpty__title">Sin notificaciones</h3>
          <p className="npEmpty__text">Cuando haya novedades, van a aparecer acá.</p>
        </div>
      ) : (
        <div className="npList" aria-label="Listado de notificaciones">
          {items.map((n) => {
            const unread = !n.readAt;
            return (
              <button
                key={n._id}
                type="button"
                className={`npItem ${unread ? "npItem--unread" : ""}`}
                onClick={() => openModal(n)}
              >
                <div className="npItem__row">
                  <div className="npItem__title">{n.title}</div>
                  <div className="npItem__date">{fmtDateTime(n.createdAt)}</div>
                </div>

                <div className="npItem__msg">{n.message}</div>

                <div className="npItem__meta">
                  {unread ? <span className="npBadge">Nuevo</span> : <span className="npMuted">Leída</span>}
                  <span className="npChevron">
                    <i className="bi bi-chevron-right" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Paginación (una línea) */}
      {totalPages > 1 && (
        <div className="npPager" aria-label="Paginación">
          <button className="npPageBtn" onClick={() => fetchList(page - 1)} disabled={page <= 1}>
            <i className="bi bi-chevron-left" />
          </button>

          <div className="npPageInfo">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </div>

          <button className="npPageBtn" onClick={() => fetchList(page + 1)} disabled={page >= totalPages}>
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      )}

      {/* Modal resumen */}
      {modalOpen && (
        <div className="npModalOverlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="npModal" onClick={(e) => e.stopPropagation()}>
            <div className="npModalHead">
              <div className="npModalTitle">
                <i className="bi bi-bell" />
                Notificación
              </div>
              <button className="npModalClose" type="button" onClick={closeModal} aria-label="Cerrar">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="npModalBody">
              <div className="npModalH">{active?.title}</div>
              <div className="npModalDate">{fmtDateTime(active?.createdAt)}</div>
              <div className="npModalMsg">{active?.message}</div>

              {active?.meta?.status ? (
                <div className="npModalPill">Estado: {active.meta.status}</div>
              ) : null}
            </div>

            <div className="npModalFoot">
              <button className="npModalBtn npModalBtn--ghost" type="button" onClick={closeModal}>
                Cerrar
              </button>
              <button className="npModalBtn npModalBtn--primary" type="button" onClick={goToTarget}>
                Ver detalle
              </button>
            </div>
          </div>
        </div>
      )}

      <StickyActions>
        <button className="npBtn npBtn--secondary" onClick={() => navigate(-1)}>Volver</button>
        <button className="npBtn npBtn--primary" onClick={() => navigate("/")}>Explorar productos</button>
      </StickyActions>
    </section>
  );
}
