import React, { useMemo, useState } from "react";
import "../css/productCard.css";
import { getCategoryLabelFromIndex } from "../utils/categoryIndex";

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

const ProductCard = ({
  product,
  categoryIndex,
  showCategory = true,

  // favoritos
  isFavorite = false,
  onToggleFavorite,

  // carrito
  isInCart = false,
  onAddToCart,
  onRemoveFromCart,

  // navegación
  onOpen,

  placeholderImg = "/img/placeholder-product.png",
}) => {
  const discount = Number(product?.discount_percentaje) || 0;
  const stock = Number(product?.stock || 0);
  const isOut = stock === 0;

  const productId = product?._id ? String(product._id) : "";

  const finalPrice = useMemo(
    () => calcDiscountedPrice(product?.price || 0, discount),
    [product?.price, discount]
  );

  const categoryLabel = useMemo(
    () =>
      getCategoryLabelFromIndex(
        categoryIndex,
        product?.categoryId,
        product?.subCategoryId
      ),
    [categoryIndex, product?.categoryId, product?.subCategoryId]
  );

  const [imgSrc, setImgSrc] = useState(product?.cover || placeholderImg);

  const title = `${product?.brand ?? ""} ${product?.model ?? ""}`.trim();

  const handleOpen = () => onOpen?.(product);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") handleOpen();
  };

  const handleCart = (e) => {
    e.stopPropagation();
    if (!productId) return;

    if (isInCart) onRemoveFromCart?.(productId);
    else onAddToCart?.(product);
  };

  const handleFav = (e) => {
    e.stopPropagation();
    onToggleFavorite?.(product);
  };

  // ✅ si no hay stock y NO está en carrito => deshabilitado
  const cartDisabled = !isInCart && isOut;

  return (
    <article
      className={`tzCard ${isOut ? "tzCard--out" : ""}`}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Abrir producto ${title}`}
    >
      {/* 🟥 SIN STOCK (ribbon) */}
      {isOut && <span className="tzCard__ribbon">AGOTADO</span>}

      {/* 🔴 DESCUENTO (badge a la derecha, rojo) */}
      {discount > 0 && <span className="tzCard__badge">-{discount}%</span>}

      <div className="tzCard__imageWrap">
        <img
          className="tzCard__img"
          src={imgSrc}
          alt={title}
          loading="lazy"
          onError={() => setImgSrc(placeholderImg)}
        />
      </div>

      <div className="tzCard__body">
        <h3 className="tzCard__title">
          <span className="tzCard__brand">{product?.brand}</span>{" "}
          {product?.model}
        </h3>

        {showCategory && categoryLabel && (
          <p className="tzCard__category">{categoryLabel}</p>
        )}

        <div className="tzCard__divider" />

        <div className="tzCard__bottom">
          {/* ✅ precios: si hay descuento, primero tachado y después final en rojo */}
          <div className="tzCard__prices">
            <span
              className="tzCard__priceOld"
              aria-hidden={discount === 0}
              title={discount > 0 ? "Precio original" : undefined}
            >
              {discount > 0 ? formatPrice(product?.price) : "\u00A0"}
            </span>

            <span
              className={
                discount > 0
                  ? "tzCard__price tzCard__price--discount"
                  : "tzCard__price"
              }
              title="Precio final"
            >
              {formatPrice(finalPrice)}
            </span>
          </div>

          <div className="tzCard__actions">
            <button
              type="button"
              className={
                isInCart
                  ? "tzCard__iconBtn tzCard__iconBtn--cartActive"
                  : "tzCard__iconBtn"
              }
              onClick={handleCart}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={cartDisabled}
              aria-label={isInCart ? "Remover del carrito" : "Agregar al carrito"}
              title={
                isInCart
                  ? "Remover del carrito"
                  : isOut
                  ? "Sin stock"
                  : "Agregar al carrito"
              }
            >
              <i className={isInCart ? "bi bi-cart-check" : "bi bi-cart3"} />
            </button>

            <button
              type="button"
              className={
                isFavorite
                  ? "tzCard__iconBtn tzCard__iconBtn--favActive"
                  : "tzCard__iconBtn"
              }
              onClick={handleFav}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <i className={isFavorite ? "bi bi-heart-fill" : "bi bi-heart"} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
