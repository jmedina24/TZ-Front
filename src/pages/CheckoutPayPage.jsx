// src/pages/CheckoutPayPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import "../css/checkoutPayPage.css";

// Logos
import visaLogo from "../assets/visa.svg";
import masterLogo from "../assets/mastercard.svg";
import amexLogo from "../assets/amex.svg";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const maskCard = (n = "") => `**** **** **** ${String(n).slice(-4)}`;

const brandLogoSrc = (brand = "") => {
  const b = String(brand || "").toLowerCase();
  if (b.includes("visa")) return visaLogo;
  if (b.includes("master")) return masterLogo;
  if (b.includes("amex")) return amexLogo;
  return null;
};

const categoryBadgeClass = (cat = "") => {
  const c = String(cat || "").toLowerCase();
  if (c.includes("cr")) return "payTag payTag--credit";
  if (c.includes("de")) return "payTag payTag--debit";
  return "payTag";
};

const isCardExpired = (month, year) => {
  const m = Number(month) || 0;
  const y = Number(year) || 0;
  if (!m || !y) return false;

  const now = new Date();
  const exp = new Date(y, m, 0, 23, 59, 59, 999);
  return exp < now;
};

const formatMoney = (value) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export default function CheckoutPayPage() {
  const navigate = useNavigate();
  const { token, user, showToast } = useOutletContext();

  const cards = useMemo(
    () => (Array.isArray(user?.cards) ? user.cards : []),
    [user]
  );

  const [paymentMethod, setPaymentMethod] = useState("Tarjeta de crédito");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [installments, setInstallments] = useState(1);
  const [externalOpened, setExternalOpened] = useState(false);

  const isExternal =
    paymentMethod === "MercadoPago" || paymentMethod === "PayPal";

  // total desde checkout
  const checkoutTotal = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("tz_checkout_total");
      const parsed = raw ? JSON.parse(raw) : null;
      const t = Number(parsed?.total);
      return Number.isFinite(t) ? t : 0;
    } catch {
      return 0;
    }
  }, []);

  const filteredCards = useMemo(() => {
    if (!paymentMethod.startsWith("Tarjeta")) return cards;

    const wantsCredit = paymentMethod === "Tarjeta de crédito";

    return cards
      .filter((c) => {
        if (!c.cardCategory) return true;
        const cat = String(c.cardCategory).toLowerCase();
        return wantsCredit ? cat.includes("cr") : cat.includes("de");
      })
      .map((c) => ({
        ...c,
        __expired: isCardExpired(c.expirationMonth, c.expirationYear),
      }));
  }, [cards, paymentMethod]);

  const selectedCard = useMemo(
    () =>
      filteredCards.find(
        (c) => String(c._id) === String(selectedCardId)
      ) || null,
    [filteredCards, selectedCardId]
  );

  const selectedIsCredit = useMemo(() => {
    const cat = String(selectedCard?.cardCategory || "").toLowerCase();
    if (!cat) return paymentMethod === "Tarjeta de crédito";
    return cat.includes("cr");
  }, [selectedCard, paymentMethod]);

  const showInstallments =
    paymentMethod === "Tarjeta de crédito" &&
    !!selectedCardId &&
    selectedIsCredit &&
    !selectedCard?.__expired;

  const perInstallment = useMemo(() => {
    const n = Math.max(1, Number(installments) || 1);
    if (!checkoutTotal) return 0;
    return Math.ceil(checkoutTotal / n);
  }, [checkoutTotal, installments]);

  const canPay = useMemo(() => {
    if (isExternal) return externalOpened;

    if (paymentMethod.startsWith("Tarjeta")) {
      if (!selectedCardId) return false;
      return !selectedCard?.__expired;
    }
    return false;
  }, [
    isExternal,
    externalOpened,
    paymentMethod,
    selectedCardId,
    selectedCard,
  ]);

  const openExternal = () => {
    const url =
      paymentMethod === "MercadoPago"
        ? "https://www.mercadopago.com.uy"
        : "https://www.paypal.com";

    window.open(url, "_blank", "noopener,noreferrer");
    setExternalOpened(true);

    showToast?.(
      `${paymentMethod} abierto. Completá el proceso y luego confirmá el pago.`,
      "success"
    );
  };

  const handlePay = async () => {
    if (!token) return;

    if (!canPay) {
      showToast?.("Completá el método de pago", "error");
      return;
    }

    try {
      const rawAddr = sessionStorage.getItem("tz_checkout_address");
      const parsedAddr = rawAddr ? JSON.parse(rawAddr) : null;
      const shippingAddress = parsedAddr?.address || null;

      const body = { paymentMethod };
      if (shippingAddress) body.shippingAddress = shippingAddress;

      if (paymentMethod.startsWith("Tarjeta")) {
        body.cardId = selectedCardId;

        if (paymentMethod === "Tarjeta de crédito") {
          body.paymentDetails = { installments };
        }
      }

      if (isExternal) {
        body.paymentDetails = { opened: true };
      }

      const res = await fetch(
        `${API_BASE_URL}${API_PREFIX}/purchase/checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        showToast?.(data?.msg || "Error procesando el pago", "error");
        return;
      }

      showToast?.("✅ Compra confirmada", "success");
      navigate(`/checkout/confirmacion/${data.purchaseId}`);
    } catch (e) {
      showToast?.("Error procesando el pago", "error");
    }
  };

  const noFilteredCards =
    paymentMethod.startsWith("Tarjeta") && filteredCards.length === 0;

  if (!token) return null;

  return (
    <section className="payPage">
      <div className="payHead">
        <h2 className="payHead__title">Pago</h2>
        <p className="payHead__sub">Elegí cómo querés pagar.</p>
      </div>

      {/* MÉTODO */}
      <div className="payCard">
        <h3 className="payCard__title--bar">Método de pago</h3>

        <div className="payMethods">
          {["Tarjeta de crédito", "Tarjeta de débito", "MercadoPago", "PayPal"].map(
            (m) => (
              <button
                key={m}
                type="button"
                className={
                  paymentMethod === m
                    ? "payMethod payMethod--active"
                    : "payMethod"
                }
                onClick={() => {
                  setPaymentMethod(m);
                  setSelectedCardId("");
                  setExternalOpened(false);
                  setInstallments(1);
                }}
              >
                {m}
              </button>
            )
          )}
        </div>
      </div>

      {/* TARJETAS */}
      {paymentMethod.startsWith("Tarjeta") && (
        <div className="payCard">
          <h3 className="payCard__title--bar">Tarjeta</h3>

          {noFilteredCards ? (
            <div className="payEmpty">
              <p className="payEmpty__text">
                No hay tarjetas disponibles para{" "}
                {paymentMethod === "Tarjeta de crédito" ? "crédito" : "débito"}.
              </p>
            </div>
          ) : (
            <div className="payCards">
              {filteredCards.map((c) => {
                const logo = brandLogoSrc(c.type);
                const disabled = c.__expired;

                return (
                  <label
                    key={c._id}
                    className={
                      disabled
                        ? "payCardItem payCardItem--disabled"
                        : "payCardItem"
                    }
                  >
                    <input
                      type="radio"
                      disabled={disabled}
                      checked={selectedCardId === String(c._id)}
                      onChange={() => setSelectedCardId(String(c._id))}
                    />

                    <div className="payCardItem__body">
                      <div className="payCardItem__top">
                        <div className="payBrand">
                          {logo && (
                            <img
                              src={logo}
                              className="payBrand__logo"
                              alt={c.type}
                            />
                          )}
                          {c.bank && <span className="payMuted">{c.bank}</span>}
                        </div>

                        <div className="payTags">
                          {c.cardCategory && (
                            <span
                              className={categoryBadgeClass(c.cardCategory)}
                            >
                              {c.cardCategory}
                            </span>
                          )}
                          {disabled && (
                            <span className="payTag payTag--expired">
                              Vencida
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="payCardItem__num">
                        {maskCard(c.cardNumber)}
                      </div>
                      <div className="payMuted">
                        Vence {String(c.expirationMonth).padStart(2, "0")}/
                        {c.expirationYear}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {showInstallments && (
            <div className="payInstallments">
              <div className="payInstallments__label">Cuotas</div>

              <select
                className="paySelect"
                value={installments}
                onChange={(e) =>
                  setInstallments(Number(e.target.value))
                }
              >
                {[1, 2, 3, 6, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "cuota" : "cuotas"}
                  </option>
                ))}
              </select>

              <div className="payMuted payInstallments__hint">
                * Disponible solo para compras con tarjeta de crédito.
              </div>

              {/* ✅ TEXTO FINAL AJUSTADO */}
              <div className="payInstallments__calc">
                {checkoutTotal ? (
                  installments === 1 ? (
                    <strong>{formatMoney(checkoutTotal)}</strong>
                  ) : (
                    <>
                      {installments} pagos de{" "}
                      <strong>{formatMoney(perInstallment)}</strong>
                    </>
                  )
                ) : (
                  <span className="payMuted">
                    (Monto por cuota no disponible)
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            className="payActionLink"
            onClick={() => navigate("/perfil")}
          >
            <i className="bi bi-credit-card" />
            Administrar tarjetas
          </button>
        </div>
      )}

      {/* MP / PAYPAL */}
      {isExternal && (
        <div className="payCard">
          <h3 className="payCard__title--bar">{paymentMethod}</h3>

          <div className="payExternal">
            <p className="payExternal__text">
              Se abrirá {paymentMethod} para autorizar el pago. Cuando vuelvas,
              podrás confirmar la compra.
            </p>

            <button
              type="button"
              className="payExternal__btn"
              onClick={openExternal}
            >
              Abrir {paymentMethod}
            </button>

            {externalOpened ? (
              <div className="payExternal__ok">
                <i className="bi bi-check2-circle" />
                Autorización lista. Ya podés confirmar el pago.
              </div>
            ) : (
              <div className="payExternal__hint">
                * Primero abrí {paymentMethod} para habilitar “Confirmar pago”.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="payActions">
        <button
          type="button"
          className="payBtn payBtn--primary"
          disabled={!canPay}
          onClick={handlePay}
        >
          Confirmar pago
        </button>

        <button
          type="button"
          className="payBtn payBtn--secondary"
          onClick={() => navigate("/checkout")}
        >
          Volver
        </button>
      </div>
    </section>
  );
}
