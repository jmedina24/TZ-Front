// src/layout/RootLayout.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { createPortal } from "react-dom"; // ✅ portal

import Header from "../components/Header";
import Menu from "../subComponents/Menu";
import LoginModal from "../subComponents/LoginModal";
import RegisterModal from "../subComponents/RegisterModal";
import ForgotPasswordModal from "../subComponents/ForgotPasswordModal";
import useToast from "../hooks/useToast";
import ScrollToTop from "../subComponents/ScrollToTop";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const RootLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const [categories, setCategories] = useState([]);

  // ✅ carrito + favoritos globales (desde BD)
  const [cart, setCart] = useState([]); // [{ productId, qty, productSnapshot? }]
  const [favorites, setFavorites] = useState([]); // [productId...]

  const isLoggedIn = !!token && !!user;

  // ✅ toast global
  const { toast, showToast } = useToast();

  // =========================
  // Helpers
  // =========================
  const authHeaders = useCallback(
    (tokenToUse) => ({
      Authorization: `Bearer ${tokenToUse}`,
      "Content-Type": "application/json",
    }),
    []
  );

  // =========================
  // CATEGORIES
  // =========================
  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/categories/menu`);

      if (!res.ok) {
        console.error("No se pudieron obtener categorías:", res.status);
        setCategories([]);
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.categories || [];
      setCategories(list);
    } catch (err) {
      console.error("Error obteniendo categorías", err);
      setCategories([]);
    }
  };

  // =========================
  // AUTH - LOAD TOKEN + USER
  // =========================
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser(savedToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFavoritesAndCart = async (tokenToUse) => {
    try {
      const [favRes, cartRes] = await Promise.all([
        fetch(`${API_BASE_URL}${API_PREFIX}/user/favorites`, {
          method: "GET",
          headers: authHeaders(tokenToUse),
        }),
        fetch(`${API_BASE_URL}${API_PREFIX}/user/cart`, {
          method: "GET",
          headers: authHeaders(tokenToUse),
        }),
      ]);

      const favData = await favRes.json();
      const cartData = await cartRes.json();

      const favIds = Array.isArray(favData?.favorites)
        ? favData.favorites
            .map((f) => f?.productId?._id || f?.productId)
            .filter(Boolean)
            .map(String)
        : [];

      setFavorites(favIds);

      const cartItems = Array.isArray(cartData?.cart)
        ? cartData.cart.map((c) => ({
            productId: String(c?.productId?._id || c?.productId),
            qty: Number(c?.qty) || 1,
            productSnapshot: c?.productId && c.productId._id ? c.productId : null,
          }))
        : [];

      setCart(cartItems);
    } catch (err) {
      console.error("Error cargando favoritos/carrito:", err);
      setFavorites([]);
      setCart([]);
    }
  };

  const fetchCurrentUser = async (tokenToUse) => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/me`, {
        method: "GET",
        headers: authHeaders(tokenToUse),
      });

      if (!res.ok) {
        console.error("No se pudo obtener el usuario actual");
        handleLogout();
        return;
      }

      const data = await res.json();
      setUser(data);

      await fetchFavoritesAndCart(tokenToUse);
    } catch (err) {
      console.error("Error obteniendo usuario actual", err);
      handleLogout();
    }
  };

  const handleLoginSuccess = async (tokenFromApi) => {
    setToken(tokenFromApi);
    localStorage.setItem("token", tokenFromApi);
    await fetchCurrentUser(tokenFromApi);
    setIsLoginOpen(false);
    showToast("✅ Sesión iniciada", "success");
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    setToken(null);
    setUser(null);
    setFavorites([]);
    setCart([]);
    localStorage.removeItem("token");
    showToast("👋 Sesión cerrada", "success");
  };

  // =========================
  // VERIFIED PARAMS
  // =========================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    const reason = params.get("reason");

    if (verified === "1") {
      showToast("✅ Cuenta verificada. Ya podés iniciar sesión.", "success");
      setIsLoginOpen(true);
    } else if (verified === "0") {
      const msg =
        reason === "invalid"
          ? "El link de verificación es inválido o ya fue usado."
          : "No se pudo verificar la cuenta. Intente nuevamente.";
      showToast(`❌ ${msg}`, "error");
    }

    if (verified) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [showToast]);

  // =========================
  // UI HANDLERS
  // =========================
  const openMenu = () => setIsMenuOpen(true);

  const openLoginModal = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };

  const closeLoginModal = () => setIsLoginOpen(false);

  const openRegisterModal = () => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
  };

  const closeRegisterModal = () => setIsRegisterOpen(false);

  const openLoginFromRegister = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };

  const openForgotModal = () => {
    setIsLoginOpen(false);
    setIsForgotOpen(true);
  };

  const closeForgotModal = () => setIsForgotOpen(false);

  const openLoginFromForgot = () => {
    setIsForgotOpen(false);
    setIsLoginOpen(true);
  };

  // =========================
  // FAVORITES + CART (DB)
  // =========================
  const isFavorite = (productId) => favorites.includes(String(productId));
  const isInCart = (productId) => cart.some((i) => String(i.productId) === String(productId));

  const toggleFavorite = async (product) => {
    const id = product?._id;
    if (!id) return;

    if (!token) {
      showToast("Tenés que iniciar sesión", "error");
      setIsLoginOpen(true);
      return;
    }

    const exists = isFavorite(id);

    try {
      const res = await fetch(
        `${API_BASE_URL}${API_PREFIX}/user/favorites${exists ? `/${id}` : ""}`,
        {
          method: exists ? "DELETE" : "POST",
          headers: authHeaders(token),
          body: exists ? undefined : JSON.stringify({ productId: id }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(data?.msg || "Error actualizando favoritos", "error");
        return;
      }

      const ids = Array.isArray(data?.favorites)
        ? data.favorites.map((f) => f?.productId).filter(Boolean).map(String)
        : [];

      setFavorites(ids);

      showToast(exists ? "Producto removido de favoritos" : "Producto agregado a favoritos", "success");
    } catch (err) {
      console.error(err);
      showToast("Error actualizando favoritos", "error");
    }
  };

  const addToCart = async (product) => {
    const id = product?._id;
    if (!id) return;

    if (!token) {
      showToast("Tenés que iniciar sesión", "error");
      setIsLoginOpen(true);
      return;
    }

    if (product?.stock === 0) {
      showToast("Producto sin stock", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/cart`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ productId: id, qty: 1 }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data?.msg || "Error carrito", "error");
        return;
      }

      const items = Array.isArray(data?.cart)
        ? data.cart.map((c) => ({
            productId: String(c?.productId),
            qty: Number(c?.qty) || 1,
            productSnapshot: null,
          }))
        : [];

      setCart(items);
      showToast("Producto agregado al carrito", "success");
    } catch (err) {
      console.error(err);
      showToast("Error carrito", "error");
    }
  };

  const removeFromCart = async (productId) => {
    if (!productId) return;

    if (!token) {
      showToast("Tenés que iniciar sesión", "error");
      setIsLoginOpen(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/cart/${productId}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data?.msg || "Error carrito", "error");
        return;
      }

      const items = Array.isArray(data?.cart)
        ? data.cart.map((c) => ({
            productId: String(c?.productId),
            qty: Number(c?.qty) || 1,
            productSnapshot: null,
          }))
        : [];

      setCart(items);
      showToast("Producto removido del carrito", "success");
    } catch (err) {
      console.error(err);
      showToast("Error carrito", "error");
    }
  };

  // =========================
  // RENDER
  // =========================
  const cartCount = cart.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);

  return (
    <>
      {/* ✅ TOAST GLOBAL POR PORTAL (evita conflictos DOM / insertBefore) */}
      {toast.show &&
        createPortal(
          <div
            className={
              "login-toast " +
              (toast.type === "success" ? "login-toast--success" : "login-toast--error")
            }
            style={{
              position: "fixed",
              top: 14,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
            }}
          >
            <i
              className={
                "bi " +
                (toast.type === "success"
                  ? "bi-check-circle-fill"
                  : "bi-exclamation-circle-fill")
              }
              style={{ fontSize: "1.3rem" }}
            />
            <span>{toast.msg}</span>
          </div>,
          document.body
        )}

        <ScrollToTop />

      <Header onOpenMenu={openMenu} />

      <Menu
        isOpen={isMenuOpen}
        setIsOpen={setIsMenuOpen}
        isLoggedIn={isLoggedIn}
        onOpenLoginModal={openLoginModal}
        onLogout={handleLogout}
        user={user}
        categories={categories}
        cartCount={cartCount}
        favoritesCount={favorites.length}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={closeLoginModal}
        onLoginSuccess={handleLoginSuccess}
        onRegister={openRegisterModal}
        onForgotPassword={openForgotModal}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={closeRegisterModal}
        onGoToLogin={openLoginFromRegister}
      />

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={closeForgotModal}
        onGoToLogin={openLoginFromForgot}
      />

      <main>
        <Outlet
          context={{
            user,
            token,
            setUser,
            categories,
            showToast,

            cart,
            favorites,
            isFavorite,
            isInCart,
            addToCart,
            removeFromCart,
            toggleFavorite,

            refreshCartAndFavorites: () =>
              token ? fetchFavoritesAndCart(token) : Promise.resolve(),
          }}
        />
      </main>
    </>
  );
};

export default RootLayout;
