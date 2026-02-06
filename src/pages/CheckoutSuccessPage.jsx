// src/pages/CheckoutSuccessPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import "../css/checkoutSuccessPage.css";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token, showToast } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState(null);
  const [error, setError] = useState(null);

  const [sendingEmail, setSendingEmail] = useState(false);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : null),
    [token]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/purchase/${id}`, {
          method: "GET",
          headers: authHeaders,
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data?.msg || "No se pudo cargar la compra.");
          setPurchase(null);
          return;
        }

        setPurchase(data?.purchase || null);
      } catch (e) {
        console.error(e);
        setError("Error cargando compra.");
      } finally {
        setLoading(false);
      }
    };

    if (token && id) load();
    else setLoading(false);
  }, [token, id, authHeaders]);

  const orderShort = useMemo(() => {
    if (!purchase?._id) return "";
    return String(purchase._id).slice(-8).toUpperCase();
  }, [purchase]);

  const invoiceUrl = useMemo(() => {
    if (!id) return "";
    // abre el PDF con token (no podemos poner Authorization header en window.open)
    // ✅ Solución práctica: abrir en nueva pestaña y que el backend lea token por query (si lo implementás),
    // pero como ahora tu backend usa auth header, lo mejor es abrir en la misma app con fetch->blob.
    // Aquí usamos fetch->blob (más abajo).
    return `${API_BASE_URL}${API_PREFIX}/purchase/${id}/invoice`;
  }, [id]);

  const handleDownloadInvoice = async () => {
    try {
      if (!token) {
        showToast?.("Iniciá sesión para descargar la factura", "error");
        return;
      }

      const res = await fetch(invoiceUrl, {
        method: "GET",
        headers: authHeaders,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast?.(data?.msg || "No se pudo descargar la factura", "error");
        return;
      }

      const blob = await res.blob();
      const fileUrl = window.URL.createObjectURL(blob);

      // abrir en pestaña nueva
      window.open(fileUrl, "_blank", "noopener,noreferrer");

      // liberar después
      setTimeout(() => window.URL.revokeObjectURL(fileUrl), 15_000);
    } catch (e) {
      console.error(e);
      showToast?.("Error descargando la factura", "error");
    }
  };

  const handleSendInvoiceEmail = async () => {
    try {
      if (!token) {
        showToast?.("Iniciá sesión para enviar la factura", "error");
        return;
      }

      setSendingEmail(true);

      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/purchase/${id}/invoice/email`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showToast?.(data?.msg || "No se pudo enviar la factura", "error");
        return;
      }

      showToast?.(data?.msg || "✅ Factura enviada por email", "success");
    } catch (e) {
      console.error(e);
      showToast?.("Error enviando la factura", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  // ---- UI states
  if (!token) {
    return (
      <section className="okPage">
        <div className="okCard">
          <div className="okIcon okIcon--warn">
            <i className="bi bi-exclamation-circle" />
          </div>
          <h2 className="okTitle">Iniciá sesión</h2>
          <p className="okSub">Necesitás iniciar sesión para ver la confirmación.</p>

          <button className="okBtn okBtn--primary" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="okPage">
        <div className="okCard">
          <div className="okSkeletonTitle" />
          <div className="okSkeletonLine" />
          <div className="okSkeletonLine" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="okPage">
        <div className="okCard">
          <div className="okIcon okIcon--warn">
            <i className="bi bi-x-circle" />
          </div>
          <h2 className="okTitle">No pudimos cargar la compra</h2>
          <p className="okSub">{error}</p>

          <button className="okBtn okBtn--primary" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
          <button className="okBtn" onClick={() => navigate("/perfil")}>
            Ir a mi perfil
          </button>
        </div>
      </section>
    );
  }

  if (!purchase) {
    return (
      <section className="okPage">
        <div className="okCard">
          <div className="okIcon okIcon--warn">
            <i className="bi bi-question-circle" />
          </div>
          <h2 className="okTitle">Compra no encontrada</h2>
          <p className="okSub">No encontramos el pedido solicitado.</p>

          <button className="okBtn okBtn--primary" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="okPage">
      <div className="okCard">
        <div className="okIcon">
          <i className="bi bi-check2-circle" />
        </div>

        <h2 className="okTitle">¡Compra confirmada!</h2>
        <p className="okSub">
          Pedido <span className="okOrder">#{orderShort}</span>
        </p>

        <div className="okInfo">
          <div className="okInfo__row">
            <span className="okLabel">Estado</span>
            <span className="okValue">{purchase.status || "Confirmada"}</span>
          </div>

          <div className="okInfo__row">
            <span className="okLabel">Total</span>
            <span className="okValue">{formatPrice(purchase.total)}</span>
          </div>
        </div>

        {/* FACTURA */}
        <div className="okCardInner">
          <h3 className="okInnerTitle">Factura</h3>
          <p className="okInnerText">
            Podés descargar la factura en PDF o enviarla al correo de tu cuenta.
          </p>

          <div className="okInnerActions">
            <button className="okBtn okBtn--soft" onClick={handleDownloadInvoice}>
              <i className="bi bi-file-earmark-pdf" />
              Descargar PDF
            </button>

            <button
              className="okBtn okBtn--soft"
              onClick={handleSendInvoiceEmail}
              disabled={sendingEmail}
              title={sendingEmail ? "Enviando..." : "Enviar factura por email"}
            >
              <i className="bi bi-envelope" />
              {sendingEmail ? "Enviando..." : "Enviar por email"}
            </button>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="okActions">
          <button className="okBtn okBtn--primary" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
          <button className="okBtn" onClick={() => navigate("/perfil")}>
            Ver mis compras
          </button>
        </div>
      </div>
    </section>
  );
}
