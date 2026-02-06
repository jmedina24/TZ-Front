import React, { useMemo, useState } from "react";
import "../css/productCardMini.css";

const moneyUSD = (n) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const calcFinalPrice = (price, discountPercent) => {
  const p = Number(price || 0);
  const d = Number(discountPercent || 0);
  if (!d || d <= 0) return p;
  return Math.round(p * (1 - d / 100));
};

export default function ProductCardMini({
  product,
  onClick,
  placeholderImg = "/img/placeholder-product.png",
}) {
  const discount = Number(product?.discount_percentaje || 0);
  const hasDiscount = discount > 0;

  const stock = Number(product?.stock || 0);
  const isOut = stock <= 0;

  const name = useMemo(() => {
    if (!product) return "";
    return `${product.brand || ""} ${product.model || ""}`.trim();
  }, [product]);

  const basePrice = Number(product?.price || 0);
  const finalPrice = useMemo(
    () => calcFinalPrice(basePrice, discount),
    [basePrice, discount]
  );

  const [imgSrc, setImgSrc] = useState(product?.cover || placeholderImg);

  const handleOpen = () => {
    // Si querés bloquear navegación cuando no hay stock, descomentá:
    // if (isOut) return;
    onClick?.(product);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") handleOpen();
  };

  return (
    <article
      className={`pcmini ${isOut ? "pcmini--out" : ""}`}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Abrir producto ${name || "Producto"}`}
      title={name}
    >
      {/* Imagen */}
      {/* Ribbon agotado */}
      <div className="pcmini__ribbonClip">
        {isOut && <span className="pcmini__ribbon">AGOTADO</span>}
      </div>
      <div className="pcmini__imgWrap">
        <img
          className="pcmini__img"
          src={imgSrc}
          alt={name}
          loading="lazy"
          onError={() => setImgSrc(placeholderImg)}
        />

        {/* Badge descuento (rojo, como TZ) */}
        {hasDiscount && <span className="pcmini__badge">-{discount}%</span>}

      </div>

      {/* Info */}
      <div className="pcmini__info">
        <div className="pcmini__name">{name || "Producto"}</div>

        <div className="pcmini__prices">
          <span
            className="pcmini__old"
            aria-hidden={!hasDiscount}
            title={hasDiscount ? "Precio original" : undefined}
          >
            {hasDiscount ? moneyUSD(basePrice) : "\u00A0"}
          </span>

          <span
            className={
              hasDiscount ? "pcmini__final pcmini__final--deal" : "pcmini__final"
            }
            title="Precio"
          >
            {moneyUSD(hasDiscount ? finalPrice : basePrice)}
          </span>
        </div>
      </div>
    </article>
  );
}
