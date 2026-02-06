// src/components/ProductsList.jsx
import React, { useMemo } from "react";
import ProductCard from "../subComponents/ProductCard";
import "../css/productsGrid.css";
import { buildCategoryIndex } from "../utils/categoryIndex";

const ProductsList = ({
  products = [],
  categories = [],

  favoritesIds = [],
  onToggleFavorite,

  isInCart,
  onAddToCart,
  onRemoveFromCart,

  onOpen,
  showCategory = true,
}) => {
  const categoryIndex = useMemo(
    () => buildCategoryIndex(categories),
    [categories]
  );

  const favSet = useMemo(
    () => new Set((favoritesIds || []).map((id) => String(id))),
    [favoritesIds]
  );

  if (!products.length) {
    return <p className="tzEmptyList">No hay productos para mostrar.</p>;
  }

  return (
    <div className="tzGrid">
      {products.map((product) => {
        const pid = String(product?._id || "");
        return (
          <ProductCard
            key={pid}
            product={product}
            categoryIndex={categoryIndex}
            showCategory={showCategory}
            isFavorite={favSet.has(pid)}
            onToggleFavorite={onToggleFavorite}
            isInCart={isInCart?.(pid) || false}
            onAddToCart={onAddToCart}
            onRemoveFromCart={onRemoveFromCart}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );
};

export default ProductsList;
