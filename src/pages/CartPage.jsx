import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import "../css/cartPage.css";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const formatPrice = (value) => {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const calcDiscountedPrice = (price, discount) => {
  const p = Number(price) || 0;
  const d = Number(discount) || 0;
  if (!d || d <= 0) return p;
  return Math.round(p - p * (d / 100));
};

const CartPage = () => {
  const navigate = useNavigate();
  const { token, showToast, refreshCartAndFavorites } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // [{ productId: Product(populate), qty }]
  const [error, setError] = useState(null);

  const authHeaders = useMemo(() => {
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const loadCart = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/cart`, {
        method: "GET",
        headers: authHeaders,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.msg || "No se pudo cargar el carrito.");
        setItems([]);
        return;
      }

      setItems(Array.isArray(data?.cart) ? data.cart : []);
    } catch (e) {
      console.error(e);
      setError("Error cargando el carrito.");
      setItems([]);
    } finally {
      setLoading(false);
      await refreshCartAndFavorites?.();
    }
  }, [token, authHeaders]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Totales
  const totals = useMemo(() => {
    let qtyTotal = 0;
    let subtotalList = 0;      // precio lista (sin descuento)
    let subtotalFinal = 0;     // precio final (con descuento)

    for (const it of items) {
      const p = it?.productId;
      if (!p) continue;

      const qty = Number(it?.qty) || 1;
      qtyTotal += qty;

      const price = Number(p?.price) || 0;
      const finalUnit = calcDiscountedPrice(price, p?.discount_percentaje);

      subtotalList += price * qty;
      subtotalFinal += finalUnit * qty;
    }

    const discountTotal = Math.max(0, subtotalList - subtotalFinal);
    return { qtyTotal, subtotalList, subtotalFinal, discountTotal };
  }, [items]);

  const shipping = 0; // por ahora
  const total = totals.subtotalFinal + shipping;

  // Actions
  const addOne = async (productId) => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/cart`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ productId, qty: 1 }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast?.(data?.msg || "Error actualizando carrito", "error");
        return;
      }

      await loadCart();
      await refreshCartAndFavorites?.();
    } catch {
      showToast?.("Error actualizando carrito", "error");
    }
  };

  const decOne = async (productId) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_PREFIX}/user/cart/${productId}/decrement`,
        { method: "PATCH", headers: authHeaders }
      );

      const data = await res.json();
      if (!res.ok) {
        showToast?.(data?.msg || "Error actualizando carrito", "error");
        return;
      }

      await loadCart();
      await refreshCartAndFavorites?.();
    } catch {
      showToast?.("Error actualizando carrito", "error");
    }
  };

  const removeItem = async (productId) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_PREFIX}/user/cart/${productId}`,
        { method: "DELETE", headers: authHeaders }
      );

      const data = await res.json();
      if (!res.ok) {
        showToast?.(data?.msg || "Error removiendo producto", "error");
        return;
      }

      showToast?.("Producto removido del carrito", "success");
      await loadCart();
      await refreshCartAndFavorites?.();
    } catch {
      showToast?.("Error removiendo producto", "error");
    }
  };

  // Estados UI
  if (!token) {
    return (
      <section className="cartPage">
        <div className="cartEmpty">
          <h3 className="cartEmpty__title">Iniciá sesión para ver tu carrito</h3>
          <p className="cartEmpty__text">Agregá productos y volvé acá.</p>
          <button
            className="cartBtn cartBtn--primary"
            onClick={() => navigate("/")}
          >
            Volver al inicio
          </button>
        </div>
      </section>
    );
  }

  if (loading) return <p style={{ padding: 12 }}>Cargando carrito...</p>;

  return (
    <section className="cartPage">
      <div className="cartHead">
        <div className="cartHead__row">
          <h2 className="cartHead__title">Carrito</h2>
          <span className="cartHead__count">{totals.qtyTotal}</span>
        </div>

        {error && <p className="cartHead__error">{error}</p>}
      </div>

      {!items.length ? (
        <div className="cartEmpty">
          <div className="cartEmpty__icon">
            <i className="bi bi-cart3" />
          </div>
          <h3 className="cartEmpty__title">Tu carrito está vacío</h3>
          <p className="cartEmpty__text">Explorá productos y agregalos al carrito.</p>
          <button
            className="cartBtn cartBtn--primary"
            onClick={() => navigate("/")}
          >
            Explorar productos
          </button>
        </div>
      ) : (
        <>
          <div className="cartList">
            {items.map((it) => {
              const p = it?.productId;
              const pid = p?._id ? String(p._id) : "";
              const qty = Number(it?.qty) || 1;

              const discount = Number(p?.discount_percentaje) || 0;
              const unit = calcDiscountedPrice(p?.price, discount);
              const lineTotal = unit * qty;

              const title = `${p?.brand ?? ""} ${p?.model ?? ""}`.trim();

              return (
                <article key={pid} className="cartItem">
                  <div className="cartItem__thumb">
                    <img
                      src={p?.cover || "/img/placeholder-product.png"}
                      alt={title}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/img/placeholder-product.png";
                      }}
                    />
                  </div>

                  <div className="cartItem__main">
                    <button
                      className="cartItem__title"
                      onClick={() => navigate(`/producto/${pid}`)}
                      title={title}
                    >
                      {title}
                    </button>

                    <div className="cartItem__prices">
                      <span
                        className={
                          discount > 0
                            ? "cartItem__price cartItem__price--discount"
                            : "cartItem__price"
                        }
                      >
                        {formatPrice(unit)}
                      </span>

                      {/* siempre existe para reservar espacio */}
                      <span className="cartItem__old" aria-hidden={discount === 0}>
                        {discount > 0 ? formatPrice(p?.price) : "\u00A0"}
                      </span>
                    </div>

                    <div className="cartItem__bottom">
                      <div className="cartQty">
                        <button
                          type="button"
                          className="cartQty__btn"
                          onClick={() => decOne(pid)}
                          aria-label="Restar"
                        >
                          <i className="bi bi-dash" />
                        </button>

                        <span className="cartQty__value">{qty}</span>

                        <button
                          type="button"
                          className="cartQty__btn"
                          onClick={() => addOne(pid)}
                          aria-label="Sumar"
                        >
                          <i className="bi bi-plus" />
                        </button>
                      </div>

                      <span className="cartItem__lineTotal">
                        {formatPrice(lineTotal)}
                      </span>

                      <button
                        type="button"
                        className="cartItem__remove"
                        onClick={() => removeItem(pid)}
                        aria-label="Eliminar"
                        title="Eliminar"
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ✅ spacer para que el contenido no quede tapado por el fixed summary */}
          <div className="cartSummarySpacer" aria-hidden="true" />

          {/* Resumen fijo */}
          <div className="cartSummary">
            <div className="cartSummary__row">
              <span className="cartSummary__label">Subtotal</span>
              <span className="cartSummary__value">
                {formatPrice(totals.subtotalList)}
              </span>
            </div>

            <div className="cartSummary__row">
              <span className="cartSummary__label cartSummary__label--discount">
                Descuentos
              </span>
              <span className="cartSummary__value cartSummary__value--discount">
                -{formatPrice(totals.discountTotal)}
              </span>
            </div>

            <div className="cartSummary__row">
              <span className="cartSummary__label">Envío</span>
              <span className="cartSummary__value">
                {shipping === 0 ? "Gratis" : formatPrice(shipping)}
              </span>
            </div>

            <div className="cartSummary__divider" />

            <div className="cartSummary__totalRow">
              <span className="cartSummary__totalLabel">Total</span>
              <span className="cartSummary__totalValue">{formatPrice(total)}</span>
            </div>

            <button
              type="button"
              className="cartBtn cartBtn--primary cartBtn--cta"
              onClick={() => navigate("/checkout")}
            >
              Iniciar compra
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default CartPage;
