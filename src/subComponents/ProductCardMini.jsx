import React, { useMemo } from "react";
import "../css/productCardMini.css";

function formatPriceUYU(n) {
  const value = Number(n || 0);
  return value.toLocaleString("es-UY", { style: "currency", currency: "UYU" });
}

function calcFinalPrice(price, discountPercent) {
  const p = Number(price || 0);
  const d = Number(discountPercent || 0);
  if (!d) return p;
  return Math.round(p * (1 - d / 100));
}

export default function ProductCardMini({ product, onClick }) {
  const name = useMemo(() => {
    if (!product) return "";
    return `${product.brand || ""} ${product.model || ""}`.trim();
  }, [product]);

  const hasDiscount = Number(product?.discount_percentaje || 0) > 0;
  const basePrice = Number(product?.price || 0);
  const finalPrice = calcFinalPrice(basePrice, product?.discount_percentaje || 0);
  const isOut = Number(product?.stock || 0) <= 0;

  return (
    <button
      type="button"
      className={`pcmini ${isOut ? "pcmini--out" : ""}`}
      onClick={onClick}
      disabled={isOut}
    >
      {/* Imagen */}
      <div className="pcmini__imgWrap">
        {product?.cover ? (
          <img className="pcmini__img" src={product.cover} alt={name} />
        ) : (
          <div className="pcmini__ph" aria-hidden="true">
            <i className="bi bi-image" />
          </div>
        )}

        {hasDiscount && (
          <span className="pcmini__badge">-{product.discount_percentaje}%</span>
        )}

        {isOut && <span className="pcmini__ribbon">AGOTADO</span>}
      </div>

      {/* Info */}
      <div className="pcmini__info">
        <div className="pcmini__name" title={name}>
          {name}
        </div>

        {hasDiscount ? (
          <div className="pcmini__prices">
            <span className="pcmini__old">{formatPriceUYU(basePrice)}</span>
            <span className="pcmini__final">{formatPriceUYU(finalPrice)}</span>
          </div>
        ) : (
          <div className="pcmini__final">{formatPriceUYU(basePrice)}</div>
        )}
      </div>
    </button>
  );
}
