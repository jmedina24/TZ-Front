// src/layout/RootLayout.jsx
import React, { useState, useRef, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Menu from "../subComponents/Menu";
import LoginModal from "../subComponents/LoginModal";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1"; // ajusta a tu API_VERSION real

const RootLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const isLoggedIn = !!token && !!user;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/categories/menu`);
      if (!res.ok) {
        console.error("No se pudieron obtener categorías");
        return;
      }
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("Error obteniendo categorías", err);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser(savedToken);
    }
  }, []);

  const openMenu = () => setIsMenuOpen(true);
  const openLoginModal = () => setIsLoginOpen(true);
  const closeLoginModal = () => setIsLoginOpen(false);

  const handleLogout = () => {
    setIsMenuOpen(false);
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  const fetchCurrentUser = async (tokenToUse) => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error("No se pudo obtener el usuario actual");
        handleLogout();
        return;
      }

      const data = await res.json();
      setUser(data); // getMe te devuelve el user directo
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
  };

  return (
    <>
      <Header onOpenMenu={openMenu} />

      <Menu
        isOpen={isMenuOpen}
        setIsOpen={setIsMenuOpen}
        isLoggedIn={isLoggedIn}
        onOpenLoginModal={openLoginModal}
        onLogout={handleLogout}
        user={user}
        categories={categories}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={closeLoginModal}
        onLoginSuccess={handleLoginSuccess}
      />

      <main>
        {/* 👇 acá pasamos user, token y setUser al Outlet */}
        <Outlet context={{ user, token, setUser, categories }} />
      </main>
    </>
  );
};

export default RootLayout;
