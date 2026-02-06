import React, { useEffect, useMemo } from "react";
import "../css/paymentMethodsModal.css";

import visa from "../assets/visa.svg";
import mastercard from "../assets/mastercard.svg";
import amex from "../assets/amex.svg";
import mercadopago from "../assets/MercadoPago.svg";
import paypal from "../assets/PayPal.svg.png";

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

export default function PaymentMethodsModal({ open, onClose }) {
  const PAYMENT_ICONS = useMemo(
    () => ({
      visa,
      mastercard,
      amex,
      mercadopago,
      paypal,
    }),
    []
  );

  useEffect(() => {
    lockBodyScroll(open);
    return () => lockBodyScroll(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="pmOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Medios de pago disponibles"
      onClick={onClose}
    >
      <div className="pmPanel" onClick={(e) => e.stopPropagation()}>
        {/* HEADER estilo checkout */}
        <div className="pmHead">
          <div className="pmTitle">
            <i className="bi bi-credit-card" />
            Medios de pago
          </div>

          <button
            className="pmClose"
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* BODY */}
        <div className="pmBody">
          {/* CRÉDITO */}
          <div className="pmBox">
            <div className="pmBox__top">
              <div className="pmBox__title">
                <i className="bi bi-credit-card-2-front" />
                Crédito
              </div>

              <div className="pmIcons" aria-label="Tarjetas de crédito">
                <img className="pmIcon" src={PAYMENT_ICONS.visa} alt="Visa" />
                <img
                  className="pmIcon"
                  src={PAYMENT_ICONS.mastercard}
                  alt="Mastercard"
                />
                <img className="pmIcon" src={PAYMENT_ICONS.amex} alt="American Express" />
              </div>
            </div>

            <div className="pmBox__note">
              Hasta <strong>12 cuotas sin interés</strong> (según banco/emisor).
            </div>
          </div>

          {/* DÉBITO */}
          <div className="pmBox">
            <div className="pmBox__top">
              <div className="pmBox__title">
                <i className="bi bi-credit-card" />
                Débito
              </div>

              <div className="pmIcons" aria-label="Tarjetas de débito">
                <img className="pmIcon" src={PAYMENT_ICONS.visa} alt="Visa" />
                <img
                  className="pmIcon"
                  src={PAYMENT_ICONS.mastercard}
                  alt="Mastercard"
                />
              </div>
            </div>

            <div className="pmBox__note">
              Acreditación <strong>inmediata</strong>.
            </div>
          </div>

          {/* MERCADOPAGO */}
          <div className="pmBox">
            <div className="pmBox__top pmBox__top--brandOnly">
              <div className="pmIcons" aria-label="MercadoPago">
                <img
                  className="pmIcon pmIcon--wide"
                  src={PAYMENT_ICONS.mercadopago}
                  alt="MercadoPago"
                />
              </div>
            </div>

            <div className="pmBox__note">
              Pagá con <strong>saldo</strong> o <strong>tarjeta</strong> desde la plataforma.
            </div>
          </div>

          {/* PAYPAL */}
          <div className="pmBox">
            <div className="pmBox__top pmBox__top--brandOnly">
              <div className="pmIcons" aria-label="PayPal">
                <img
                  className="pmIcon pmIcon--wide"
                  src={PAYMENT_ICONS.paypal}
                  alt="PayPal"
                />
              </div>
            </div>

            <div className="pmBox__note">
              Pagos online para <strong>compras internacionales</strong>.
            </div>
          </div>
        </div>

        <div className="pmFoot">
          <button className="pmBtn pmBtn--primary" type="button" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
