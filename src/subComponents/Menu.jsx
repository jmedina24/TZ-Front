// src/subComponents/Menu.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../css/menu.css";

const API_BASE_URL = "http://localhost:3977"; // mismo que en el layout

const Menu = ({
  isOpen,
  setIsOpen,
  isLoggedIn,
  onOpenLoginModal,
  onLogout,
  user,
}) => {
  const navigate = useNavigate();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const handleBack = () => {
    setIsOpen(false);
    setIsAccountMenuOpen(false);
    navigate("/");
  };

  const handleAccountClick = () => {
    if (!isLoggedIn) {
      onOpenLoginModal && onOpenLoginModal();
      return;
    }
    setIsAccountMenuOpen((prev) => !prev);
  };

  const handleGoToProfile = () => {
    setIsAccountMenuOpen(false);
    setIsOpen(false);
    navigate("/perfil");
  };

  const handleLogoutClick = () => {
    setIsAccountMenuOpen(false);
    onLogout && onLogout();
  };

  const fullName =
    user && (user.firstName || user.firstSurname)
      ? `${user.firstName || ""} ${user.firstSurname || ""}`.trim()
      : "";

  // IMPORTANTE: como usás app.use(express.static('uploads')),
  // la URL es BASE + '/' + user.avatar (ej: /avatars/archivo.png)
  const avatarUrl =
    user && user.avatar ? `${API_BASE_URL}/${user.avatar}` : null;

  return (
    <div className={`menu ${isOpen ? "open" : ""}`}>
      <div className="menu__subcontainer">
        {/* TOP */}
        <div className="menu__container-top">
          {/* Flecha de volver */}
          <div className="menu__back-wrapper">
            <button className="menu__back-btn" onClick={handleBack}>
              <i className="bi bi-arrow-left"></i>
            </button>
          </div>

          {/* Columna de cuenta: info + dropdown */}
          <div className="menu__account-column menu__account-relative">
            <button
              type="button"
              className="menu__account-inline"
              onClick={handleAccountClick}
            >
              <div className="menu__account-photo">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || "Avatar usuario"}
                    className="menu__avatar-img"
                  />
                ) : (
                  <i className="bi bi-person-circle"></i>
                )}
              </div>

              <div className="menu__account-text">
                <span className="menu__account-title">
                  {isLoggedIn ? fullName || "Mi cuenta" : "Iniciar sesión"}
                </span>
                {isLoggedIn ? (
                  <span className="menu__account-subtitle">
                    Administrar cuenta
                  </span>
                ) : (
                  <span className="menu__account-subtitle">
                    Toca para iniciar sesión
                  </span>
                )}
              </div>

              {isLoggedIn && (
                <i
                  className={`bi bi-chevron-${
                    isAccountMenuOpen ? "up" : "down"
                  } menu__account-arrow`}
                ></i>
              )}
            </button>

            {isLoggedIn && isAccountMenuOpen && (
              <div className="menu__account-dropdown">
                <button
                  className="menu__account-option"
                  onClick={handleGoToProfile}
                >
                  Administrar perfil
                </button>
                <button
                  className="menu__account-option"
                  onClick={handleLogoutClick}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>

        {/* OPCIONES DEL MENÚ */}
        <div className="menu__container-bottom">
          <div className="menu__container-list">
            <h5>Menú</h5>

            <Link className="menu__btn" to="/">
              <i className="bi bi-house-door"></i>Inicio
            </Link>
            <Link className="menu__btn" to="#">
              <i className="bi bi-search"></i>Buscar Producto
            </Link>
            <Link className="menu__btn" to="#">
              <i className="bi bi-list-task"></i>Categorías
            </Link>
            <Link className="menu__btn" to="#">
              <i className="bi bi-lightning"></i>Más vendidos
            </Link>

            <br />

            <Link className="menu__btn" to="#">
              <i className="bi bi-cart"></i>Carrito de Compras
            </Link>
            <Link className="menu__btn" to="#">
              <i className="bi bi-heart"></i>Favoritos
            </Link>
            <Link className="menu__btn" to="#">
              <i className="bi bi-clock-history"></i>Mis Compras
            </Link>

            <br />

            <Link className="menu__btn" to="#">
              <i className="bi bi-envelope"></i>Contacto
            </Link>
            <Link className="menu__btn" to="#">
              <i className="bi bi-info-circle"></i>Preguntas Frecuentes
            </Link>

            <br />

            <h5>Menú de Administrador</h5>
            <Link className="menu__btn" to="#">
              <i className="bi bi-currency-dollar"></i>Gestionar Ventas
            </Link>
            <Link className="menu__btn" to="#">
              <i className="bi bi-box-seam"></i>Gestionar Productos
            </Link>
            <Link className="menu__btn" to="#">
              <i className="bi bi-bookmark"></i>Gestionar Categorías
            </Link>
            <Link className="menu__btn" to="#">
              <i className="bi bi-people"></i>Gestionar Usuarios
            </Link>
          </div>
        </div>

        {/* REDES */}
        <div className="menu__container-social">
          <Link className="menu__social">
            <i className="bi bi-whatsapp"></i>
          </Link>
          <Link className="menu__social">
            <i className="bi bi-instagram"></i>
          </Link>
          <Link className="menu__social">
            <i className="bi bi-twitter-x"></i>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Menu;
