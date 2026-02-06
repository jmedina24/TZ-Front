import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import ProductsList from "../components/ProductsList";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const Home = () => {
  const navigate = useNavigate();

  // ✅ todo viene del RootLayout
  const {
    categories,
    favorites,
    toggleFavorite,
    addToCart,
    removeFromCart,
    isInCart,
  } = useOutletContext();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/product/get`);
        if (!res.ok) {
          console.error("Error cargando productos:", res.status);
          setProducts([]);
          return;
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : data.products || [];
        setProducts(list);
      } catch (err) {
        console.error("Error cargando productos:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) return <p style={{ padding: "12px 0" }}>Cargando productos...</p>;

  return (
    <section style={{ padding: "12px 0" }}>
      <h2 style={{ margin: "0 0 12px" }}>Productos</h2>

      <ProductsList
        products={products}
        categories={categories}
        favoritesIds={favorites}
        onToggleFavorite={toggleFavorite}
        isInCart={isInCart}
        onAddToCart={addToCart}
        onRemoveFromCart={removeFromCart}
        onOpen={(prod) => navigate(`/producto/${prod._id}`)}
        showCategory={true}
      />
    </section>
  );
};

export default Home;
