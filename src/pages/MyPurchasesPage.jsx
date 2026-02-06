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

export default function MyPurchasesPage() {
  const navigate = useNavigate();
  const { token, showToast } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState(null);

  const [downloadingId, setDownloadingId] = useState(null);
  const [emailingId, setEmailingId] = useState(null);

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

  const handleDownloadInvoice = async (purchaseId) => {
    if (!token || !purchaseId) return;

    setDownloadingId(purchaseId);
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_PREFIX}/purchase/${purchaseId}/invoice`,
        { method: "GET", headers: authHeaders }
      );

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
      const res = await fetch(
        `${API_BASE_URL}${API_PREFIX}/purchase/${purchaseId}/invoice/email`,
        { method: "POST", headers: authHeaders }
      );

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
        <h2 className="coHead__title">Mis compras</h2>
        <p className="coHead__sub">Historial de compras y facturas.</p>
        {error && <p className="coHead__error">{error}</p>}
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

      {purchases.map((p) => {
        const id = p?._id;
        const total = Number(p?.total) || 0;
        const status = p?.status || "—";
        const method = p?.paymentMethod || "—";
        const created = fmtDateTime(p?.createdAt);

        return (
          <div key={id} className="coCard">
            <h3 className="coCard__title coCard__title--bar">
              Compra #{shortId(id)}
            </h3>

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
