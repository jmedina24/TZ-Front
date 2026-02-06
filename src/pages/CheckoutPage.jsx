// src/pages/CheckoutPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import "../css/checkoutPage.css";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);

const calcDiscountedPrice = (price, discount) => {
  const p = Number(price) || 0;
  const d = Number(discount) || 0;
  if (!d || d <= 0) return p;
  return Math.round(p - p * (d / 100));
};

const normStr = (v) => String(v ?? "").trim();

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { token, user, showToast } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [error, setError] = useState(null);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : null),
    [token]
  );

  const addresses = useMemo(
    () => (Array.isArray(user?.addresses) ? user.addresses : []),
    [user]
  );

  useEffect(() => {
    if (!addresses.length) setSelectedAddressIndex(0);
    else if (selectedAddressIndex >= addresses.length) setSelectedAddressIndex(0);
  }, [addresses.length, selectedAddressIndex]);

  useEffect(() => {
    const loadCart = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/cart`, {
          headers: authHeaders,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.msg);
        setCartItems(Array.isArray(data?.cart) ? data.cart : []);
      } catch (e) {
        setError("Error cargando carrito");
      } finally {
        setLoading(false);
      }
    };
    loadCart();
  }, [token, authHeaders]);

  const totals = useMemo(() => {
    let subtotalList = 0;
    let subtotalFinal = 0;

    cartItems.forEach((it) => {
      const p = it?.productId;
      if (!p) return;

      const qty = Math.max(1, Number(it?.qty) || 1);
      const unit = calcDiscountedPrice(p?.price, p?.discount_percentaje);

      subtotalList += (Number(p?.price) || 0) * qty;
      subtotalFinal += (Number(unit) || 0) * qty;
    });

    return {
      subtotalList,
      subtotalFinal,
      discountTotal: Math.max(0, subtotalList - subtotalFinal),
    };
  }, [cartItems]);

  const shipping = 0;
  const total = totals.subtotalFinal + shipping;

  const selectedAddress = addresses[selectedAddressIndex];
  const canContinue = cartItems.length && selectedAddress?.street && selectedAddress?.city;

  if (!token || loading) return null;

  // ✅ Normaliza y deja SOLO lo que necesita el backend (street/city obligatorios)
  const buildShippingAddress = (a) => {
    if (!a) return null;

    const street = normStr(a.street);
    const city = normStr(a.city);

    // si faltan, devolvemos null para forzar validación
    if (!street || !city) return null;

    return {
      // requeridos por tu controller
      street,
      city,

      // opcionales útiles para factura / email
      number: normStr(a.number),
      department: normStr(a.department),
      locality: normStr(a.locality),
      country: normStr(a.country) || "Uruguay",
      postalCode: normStr(a.postalCode),
      reference: normStr(a.reference),
      phone: normStr(a.phone),
    };
  };

  return (
    <section className="coPage">
      <div className="coHead">
        <h2 className="coHead__title">Confirmación de datos</h2>
        <p className="coHead__sub">Revisá dirección y resumen antes de pagar.</p>
        {error && <p className="coHead__error">{error}</p>}
      </div>

      {/* DIRECCIÓN */}
      <div className="coCard">
        <h3 className="coCard__title coCard__title--bar">Dirección de envío</h3>

        {!addresses.length ? (
          <div className="coEmpty">
            <p className="coEmpty__text">
              No tenés direcciones guardadas. Agregá una en tu perfil para continuar.
            </p>
            <button className="coBtn coBtn--primary" onClick={() => navigate("/perfil")}>
              Ir a mi perfil
            </button>
          </div>
        ) : (
          <>
            <div className="coAddrList">
              {addresses.map((a, idx) => (
                <label key={idx} className="coAddr">
                  <input
                    type="radio"
                    checked={selectedAddressIndex === idx}
                    onChange={() => setSelectedAddressIndex(idx)}
                  />
                  <div>
                    <div className="coAddr__ref">{a.reference || "Dirección"}</div>
                    <div className="coAddr__line">
                      {a.street} {a.number}
                    </div>
                    <div className="coAddr__line coAddr__line--muted">{a.city}</div>
                  </div>
                </label>
              ))}
            </div>

            <button className="coActionLink" onClick={() => navigate("/perfil")}>
              <i className="bi bi-geo-alt" />
              Administrar direcciones
            </button>
          </>
        )}
      </div>

      {/* RESUMEN */}
      <div className="coCard">
        <h3 className="coCard__title coCard__title--bar">Resumen de compra</h3>

        <div className="coMiniList">
          {cartItems.map((it, i) => {
            const p = it?.productId;
            if (!p) return null;

            const qty = Math.max(1, Number(it?.qty) || 1);
            const unit = calcDiscountedPrice(p?.price, p?.discount_percentaje);

            return (
              <div key={i} className="coMiniItem">
                <img src={p.cover} alt="" className="coMiniItem__img" />

                <div className="coMiniItem__text">
                  <div className="coMiniItem__title">
                    {p.brand} {p.model}
                  </div>

                  <div className="coMiniItem__meta">
                    <span>Cant.: {qty}</span>
                    {qty > 1 && <span>({formatPrice(unit)} c/u)</span>}
                  </div>

                  <div className="coMiniItem__lineTotal">
                    <span>Total</span>
                    <span>{formatPrice(unit * qty)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="coActionLink" onClick={() => navigate("/carrito")}>
          <i className="bi bi-cart3" />
          Ver carrito completo
        </button>

        <div className="coBreakdown">
          <div className="coRow">
            <span>Subtotal</span>
            <span>{formatPrice(totals.subtotalList)}</span>
          </div>

          <div className="coRow coRow--discount">
            <span className="coLabel">Descuentos</span>
            <span className="coValue">-{formatPrice(totals.discountTotal)}</span>
          </div>

          <div className="coRow">
            <span>Envío</span>
            <span>Gratis</span>
          </div>

          <div className="coTotalRow">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <div className="coActions">
        <button
          className="coBtn coBtn--primary"
          disabled={!canContinue}
          onClick={() => {
            if (!cartItems.length) {
              showToast?.("Tu carrito está vacío", "error");
              navigate("/carrito");
              return;
            }

            const shippingAddress = buildShippingAddress(selectedAddress);
            if (!shippingAddress) {
              showToast?.("Seleccioná una dirección válida", "error");
              return;
            }

            // ✅ 1) Guardar dirección para que CheckoutPayPage la mande al backend
            sessionStorage.setItem("tz_checkout_address", JSON.stringify({ address: shippingAddress }));

            // ✅ 2) Guardar total para cuotas
            sessionStorage.setItem(
              "tz_checkout_total",
              JSON.stringify({
                total,
                subtotalList: totals.subtotalList,
                discountTotal: totals.discountTotal,
                shipping,
              })
            );

            navigate("/checkout/pago");
          }}
        >
          Continuar al pago
        </button>

        <button className="coBtn coBtn--secondary" onClick={() => navigate("/carrito")}>
          Volver al carrito
        </button>
      </div>
    </section>
  );
}
