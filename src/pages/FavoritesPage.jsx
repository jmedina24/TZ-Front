// src/pages/FavoritesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import ProductsList from "../components/ProductsList";
import "../css/favoritesPage.css";
import StickyActions from "../subComponents/StickyActions";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const FavoritesPage = () => {
  const navigate = useNavigate();

  const {
    token,
    categories,
    favorites,
    toggleFavorite,
    addToCart,
    removeFromCart,
    isInCart,
    showToast,
    refreshCartAndFavorites,
  } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [favProducts, setFavProducts] = useState([]);
  const [error, setError] = useState(null);

  const headers = useMemo(() => {
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const fetchFavProducts = async (tokenToUse) => {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/favorites`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenToUse}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.msg || "No se pudieron cargar tus favoritos.");

    const favList = Array.isArray(data?.favorites) ? data.favorites : [];
    return favList.map((f) => f?.productId).filter(Boolean);
  };

  useEffect(() => {
    const loadFavs = async () => {
      if (!token) {
        setLoading(false);
        setFavProducts([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const products = await fetchFavProducts(token);
        setFavProducts(products);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Error cargando favoritos.");
        setFavProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadFavs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setFavProducts((prev) => prev.filter((p) => favorites.includes(String(p?._id))));
  }, [favorites]);

  const handleToggleFavorite = async (product) => {
    const pid = String(product?._id || "");
    if (!pid) return;

    const wasFav = favorites.includes(pid);
    await toggleFavorite(product);

    if (!wasFav) {
      await refreshCartAndFavorites?.();
      try {
        setLoading(true);
        const products = await fetchFavProducts(token);
        setFavProducts(products);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  // NO LOGUEADO
  if (!token) {
    return (
      <section className="favPage">
        <div className="favHead">
          <h2 className="favHead__title">Favoritos</h2>
          <p className="favHead__sub">Iniciá sesión para ver tus favoritos.</p>
        </div>

        <StickyActions>
          <button
            type="button"
            className="favBtn favBtn--secondary"
            onClick={() => {
              showToast?.("Tenés que iniciar sesión", "error");
              navigate("/");
            }}
          >
            Volver al inicio
          </button>

          <button
            type="button"
            className="favBtn favBtn--primary"
            onClick={() => navigate("/")}
          >
            Explorar productos
          </button>
        </StickyActions>
      </section>
    );
  }

  // LOADING
  if (loading) {
    return (
      <section className="favPage">
        <div className="favHead">
          <h2 className="favHead__title">Favoritos</h2>
          <p className="favHead__sub">Cargando favoritos...</p>
        </div>

        <div className="favSkeleton favSkeleton--grid">
          <div className="favSkeleton__row" />
          <div className="favSkeleton__row" />
          <div className="favSkeleton__row" />
          <div className="favSkeleton__row" />
        </div>

        <StickyActions>
          <button type="button" className="favBtn favBtn--secondary" onClick={() => navigate(-1)}>
            Volver
          </button>

          <button type="button" className="favBtn favBtn--primary" onClick={() => navigate("/")}>
            Explorar productos
          </button>
        </StickyActions>
      </section>
    );
  }

  const hasFavs = favProducts.length > 0;

  return (
    <section className="favPage">
      <div className="favHead">
        <div className="favHead__row">
          <h2 className="favHead__title">Favoritos</h2>
          <span className="favHead__count">{favProducts.length}</span>
        </div>

        <p className="favHead__sub">Tus productos guardados para comprar más tarde.</p>
        {error && <p className="favHead__error">{error}</p>}
      </div>

      {!hasFavs ? (
        <div className="favEmpty">
          <div className="favEmpty__icon">
            <i className="bi bi-heart" />
          </div>

          <h3 className="favEmpty__title">Todavía no tenés favoritos</h3>
          <p className="favEmpty__text">
            Tocá el corazón en cualquier producto para guardarlo acá.
          </p>
        </div>
      ) : (
        <ProductsList
          products={favProducts}
          categories={categories}
          favoritesIds={favorites}
          onToggleFavorite={handleToggleFavorite}
          isInCart={isInCart}
          onAddToCart={addToCart}
          onRemoveFromCart={removeFromCart}
          onOpen={(prod) => navigate(`/producto/${prod._id}`)}
          showCategory={true}
        />
      )}

      <StickyActions>
        <button className="favBtn favBtn--secondary" onClick={() => navigate(-1)}>
          Volver
        </button>

        <button className="favBtn favBtn--primary" onClick={() => navigate("/")}>
          Explorar productos
        </button>
      </StickyActions>
    </section>
  );
};

export default FavoritesPage;
