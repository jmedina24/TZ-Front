// src/pages/MyPurchaseDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import "../css/checkoutPage.css";
import "../css/myPurchaseDetailPage.css";
import StickyActions from "../subComponents/StickyActions";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const money = (n) => formatPrice(n);

export default function MyPurchaseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token, showToast } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState(null);
  const [error, setError] = useState(null);

  const [sendingMail, setSendingMail] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : null),
    [token]
  );

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        setError("Iniciá sesión para ver la compra.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/purchase/${id}`, {
          method: "GET",
          headers: authHeaders,
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data?.msg || "No se pudo obtener la compra.");
        setPurchase(data?.purchase || null);
      } catch (e) {
        setError(e?.message || "Error cargando compra");
        setPurchase(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, token, authHeaders]);

  const items = useMemo(() => {
    const list = Array.isArray(purchase?.products) ? purchase.products : [];
    return list;
  }, [purchase]);

  const totals = useMemo(() => {
    const subtotalList = Number(purchase?.subtotalList) || 0;
    const discountTotal = Number(purchase?.discountTotal) || 0;
    const shipping = Number(purchase?.shipping) || 0;
    const total = Number(purchase?.total) || 0;

    const computedTotal = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);

    return {
      subtotalList: subtotalList || computedTotal + discountTotal,
      discountTotal,
      shipping,
      total: total || computedTotal + shipping,
    };
  }, [purchase, items]);

  const createdAtText = useMemo(() => {
    if (!purchase?.createdAt) return "";
    try {
      return new Date(purchase.createdAt).toLocaleString("es-UY");
    } catch {
      return "";
    }
  }, [purchase]);

  const handleDownloadInvoice = async () => {
    if (!token) return;

    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/purchase/${id}/invoice`, {
        method: "GET",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.msg || "No se pudo descargar la factura.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank", "noopener,noreferrer");

      showToast?.("✅ Factura generada", "success");
      setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      showToast?.(e?.message || "Error generando factura", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleResendInvoiceEmail = async () => {
    if (!token) return;

    setSendingMail(true);
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/purchase/${id}/invoice/email`, {
        method: "POST",
        headers: authHeaders,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.msg || "No se pudo enviar la factura.");

      showToast?.(data?.msg || "✅ Factura enviada por email", "success");
    } catch (e) {
      showToast?.(e?.message || "Error enviando factura", "error");
    } finally {
      setSendingMail(false);
    }
  };

  // ✅ NO LOGUEADO
  if (!token && !loading) {
    return (
      <section className="coPage mpdPage">
        <div className="coHead">
          <h2 className="coHead__title">Mis compras</h2>
          <p className="coHead__sub">Iniciá sesión para ver el detalle.</p>
        </div>

        <StickyActions>
          <button className="mpdBtn mpdBtn--secondary" onClick={() => navigate(-1)}>
            Volver
          </button>
          <button className="mpdBtn mpdBtn--primary" onClick={() => navigate("/")}>
            Explorar productos
          </button>
        </StickyActions>
      </section>
    );
  }

  if (loading) return null;

  return (
    <section className="coPage mpdPage">
      <div className="coHead">
        <h2 className="coHead__title">Detalle de compra</h2>
        <p className="coHead__sub">Revisá productos, factura y estado.</p>
        {error && <p className="coHead__error">{error}</p>}
      </div>

      {/* RESUMEN */}
      <div className="coCard">
        <h3 className="coCard__title coCard__title--bar">Resumen</h3>

        <div className="coBreakdown">
          <div className="coRow">
            <span>Compra</span>
            <span>#{String(purchase?._id || "").slice(-8).toUpperCase()}</span>
          </div>

          <div className="coRow">
            <span>Fecha y hora</span>
            <span>{createdAtText || "—"}</span>
          </div>

          <div className="coRow">
            <span>Estado</span>
            <span>{purchase?.status || "—"}</span>
          </div>

          <div className="coRow">
            <span>Medio de pago</span>
            <span>{purchase?.paymentMethod || "—"}</span>
          </div>

          <div className="coTotalRow">
            <span>Total</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>

        <button className="coActionLink" onClick={handleDownloadInvoice} disabled={downloading}>
          <i className="bi bi-file-earmark-pdf" />
          {downloading ? "Generando factura..." : "Ver / descargar factura"}
        </button>

        <button className="coActionLink" onClick={handleResendInvoiceEmail} disabled={sendingMail}>
          <i className="bi bi-envelope" />
          {sendingMail ? "Enviando..." : "Reenviar factura por email"}
        </button>
      </div>

      {/* DIRECCIÓN (si existe) */}
      {purchase?.shippingAddress?.street && (
        <div className="coCard">
          <h3 className="coCard__title coCard__title--bar">Dirección de envío</h3>

          <div className="coBreakdown">
            <div className="coRow">
              <span>Dirección</span>
              <span>
                {purchase.shippingAddress.street} {purchase.shippingAddress.number || ""}
              </span>
            </div>

            <div className="coRow">
              <span>Ciudad</span>
              <span>{purchase.shippingAddress.city || "—"}</span>
            </div>

            {purchase.shippingAddress.department ? (
              <div className="coRow">
                <span>Departamento</span>
                <span>{purchase.shippingAddress.department}</span>
              </div>
            ) : null}

            {purchase.shippingAddress.postalCode ? (
              <div className="coRow">
                <span>Código postal</span>
                <span>{purchase.shippingAddress.postalCode}</span>
              </div>
            ) : null}

            {purchase.shippingAddress.reference ? (
              <div className="coRow">
                <span>Referencia</span>
                <span>{purchase.shippingAddress.reference}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* PRODUCTOS */}
      <div className="coCard">
        <h3 className="coCard__title coCard__title--bar">Productos</h3>

        <div className="coMiniList">
          {items.map((it, i) => {
            const p = it.productId || {};
            const title =
              it.titleSnapshot || `${p.brand || ""} ${p.model || ""}`.trim() || "Producto";

            const cover = it.coverSnapshot || p.cover || "";
            const qty = Math.max(1, Number(it.quantity) || 1);
            const unit = Number(it.price) || 0;
            const lineTotal = Number(it.total) || unit * qty;

            return (
              <div key={i} className="coMiniItem">
                <img src={cover} alt="" className="coMiniItem__img" />

                <div className="coMiniItem__text">
                  <div className="coMiniItem__title">{title}</div>

                  <div className="coMiniItem__meta">
                    <span>Cant.: {qty}</span>
                    {qty > 1 && <span>({money(unit)} c/u)</span>}
                    {Number(it.discount_percentaje) > 0 ? (
                      <span>-{Number(it.discount_percentaje)}%</span>
                    ) : null}
                  </div>

                  <div className="coMiniItem__lineTotal">
                    <span>Total</span>
                    <span>{money(lineTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="coBreakdown">
          <div className="coRow">
            <span>Subtotal</span>
            <span>{money(totals.subtotalList)}</span>
          </div>

          <div className="coRow coRow--discount">
            <span className="coLabel">Descuentos</span>
            <span className="coValue">-{money(totals.discountTotal)}</span>
          </div>

          <div className="coRow">
            <span>Envío</span>
            <span>{totals.shipping === 0 ? "Gratis" : money(totals.shipping)}</span>
          </div>

          <div className="coTotalRow">
            <span>Total</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* ✅ Sticky bottom (reutilizable) */}
      <StickyActions>
        <button className="mpdBtn mpdBtn--secondary" onClick={() => navigate("/mis-compras")}>
          Volver a Mis compras
        </button>

        <button className="mpdBtn mpdBtn--primary" onClick={() => navigate("/")}>
          Explorar productos
        </button>
      </StickyActions>
    </section>
  );
}
