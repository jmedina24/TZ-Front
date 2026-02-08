import React, { useMemo, useRef, useLayoutEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import "../css/menu.css";
import MenuSearchLive from "../subComponents/MenuSearchLive";

const API_BASE_URL = "http://localhost:3977";

const PANELS = {
  MAIN: "main",
  SEARCH: "search",
  CATEGORIES: "categories",
  SUBCATEGORIES: "subcategories",
};

export default function Menu({
  isOpen,
  setIsOpen,
  isLoggedIn,
  onOpenLoginModal,
  onLogout,
  user,
  categories = [],

  // ✅ NUEVO: contadores
  cartCount = 0,
  favoritesCount = 0,
}) {
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [panel, setPanel] = useState(PANELS.MAIN);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // medición exacta del ancho visible del slider
  const panelsRef = useRef(null);
  const [panelsWidth, setPanelsWidth] = useState(0);

  useLayoutEffect(() => {
    if (!panelsRef.current) return;

    const el = panelsRef.current;
    const update = () => setPanelsWidth(el.getBoundingClientRect().width);

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const closeAll = () => {
    setIsAccountMenuOpen(false);
    setIsAdminOpen(false);
    setSelectedCategory(null);
    setPanel(PANELS.MAIN);
    setIsOpen(false);
  };

  const goBackPanel = () => {
    if (panel === PANELS.SUBCATEGORIES) return setPanel(PANELS.CATEGORIES);
    if (panel === PANELS.CATEGORIES || panel === PANELS.SEARCH)
      return setPanel(PANELS.MAIN);
    closeAll();
  };

  const handleAccountClick = () => {
    if (!isLoggedIn) {
      onOpenLoginModal?.();
      return;
    }
    setIsAccountMenuOpen((p) => !p);
  };

  const handleGoToProfile = () => {
    closeAll();
    navigate("/perfil");
  };

  const handleLogoutClick = () => {
    setIsAccountMenuOpen(false);
    onLogout?.();
    setIsOpen(false);
  };

  const fullName =
    user && (user.firstName || user.firstSurname)
      ? `${user.firstName || ""} ${user.firstSurname || ""}`.trim()
      : "";

  const avatarUrl = user?.avatar ? `${API_BASE_URL}/${user.avatar}` : null;
  const isAdmin = user?.role === "admin";

  const sections = useMemo(
    () => [
      {
        title: "Menú",
        items: [
          { label: "Inicio", icon: "bi-house-door", to: "/" },
          { label: "Buscar producto", icon: "bi-search", panel: PANELS.SEARCH },
          { label: "Categorías", icon: "bi-list-task", panel: PANELS.CATEGORIES },
          { label: "Más vendidos", icon: "bi-lightning", to: "/mas-vendidos" },
        ],
      },
      {
        title: "Compras",
        items: [
          { label: "Carrito", icon: "bi-cart", to: "/carrito" },
          { label: "Favoritos", icon: "bi-heart", to: "/favoritos" },
          { label: "Notificaciones", icon: "bi bi-bell", to: "/notifications" },
          { label: "Mis compras", icon: "bi-clock-history", to: "/mis-compras" },

        ],
      },
      {
        title: "Ayuda",
        items: [
          { label: "Contacto", icon: "bi-envelope", to: "/contacto" },
          { label: "Preguntas frecuentes", icon: "bi-info-circle", to: "/faq" },
        ],
      },
    ],
    []
  );

  const adminItems = useMemo(
    () => [
      { label: "Gestionar ventas", icon: "bi-currency-dollar", to: "/admin/ventas" },
      { label: "Gestionar productos", icon: "bi-box-seam", to: "/admin/productos" },
      { label: "Gestionar categorías", icon: "bi-bookmark", to: "/admin/categorias" },
      { label: "Gestionar usuarios", icon: "bi-people", to: "/admin/usuarios" },
    ],
    []
  );

  const effectiveCategories = categories?.length
    ? categories
    : [
      {
        id: "perifericos",
        nombre: "Periféricos",
        slug: "perifericos",
        icono: "bi-keyboard",
        subcategorias: [{ id: "mouse", nombre: "Mouse", slug: "mouse" }],
      },
    ];

  const openPanel = (p) => {
    setIsAccountMenuOpen(false);
    setIsAdminOpen(false);
    if (p !== PANELS.SUBCATEGORIES) setSelectedCategory(null);
    setPanel(p);
  };

  const openSubcategories = (cat) => {
    setSelectedCategory(cat);
    setPanel(PANELS.SUBCATEGORIES);
  };

  const goToSubcategory = (cat, sub) => {
    closeAll();
    navigate(`/categoria/${cat.slug}/${sub.slug}`);
  };

  const panelIndex =
    panel === PANELS.MAIN
      ? 0
      : panel === PANELS.SEARCH
        ? 1
        : panel === PANELS.CATEGORIES
          ? 2
          : 3;

  // ✅ track y panels en px exactos
  const trackStyle = {
    width: panelsWidth ? panelsWidth * 4 : "100%",
    transform: panelsWidth
      ? `translateX(-${panelIndex * panelsWidth}px)`
      : "translateX(0px)",
  };

  // ✅ IMPORTANTE: aplicar a TODOS los paneles (incluye SEARCH)
  const panelStyle = {
    width: panelsWidth || "100%",
    flex: panelsWidth ? `0 0 ${panelsWidth}px` : "0 0 100%",
  };

  // ✅ helper badge count por label
  const getBadgeForLabel = (label) => {
    if (label === "Carrito") return cartCount > 0 ? cartCount : null;
    if (label === "Favoritos") return favoritesCount > 0 ? favoritesCount : null;
    return null;
  };

  return (
    <>
      {isOpen && <div className="menu__overlay" onClick={closeAll} />}

      <aside
        className={`menu ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
      >
        {/* TOP */}
        <div className="menu__container-top">
          <div className="menu__back-wrapper">
            <button
              className="menu__back-btn"
              onClick={goBackPanel}
              aria-label="Volver"
            >
              <i className="bi bi-arrow-left" />
            </button>
          </div>

          <div className="menu__account-column menu__account-relative">
            <button
              type="button"
              className="menu__account-inline"
              onClick={handleAccountClick}
              aria-expanded={isAccountMenuOpen}
              aria-controls="account-dropdown"
            >
              <div className="menu__account-photo">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || "Avatar usuario"}
                    className="menu__avatar-img"
                  />
                ) : (
                  <i className="bi bi-person-circle" />
                )}
              </div>

              <div className="menu__account-text">
                <span className="menu__account-title">
                  {isLoggedIn ? fullName || "Mi cuenta" : "Iniciar sesión"}
                </span>
                <span className="menu__account-subtitle">
                  {isLoggedIn ? "Administrar cuenta" : "Toca para iniciar sesión"}
                </span>
              </div>

              {isLoggedIn && (
                <i
                  className={`bi bi-chevron-${isAccountMenuOpen ? "up" : "down"} menu__account-arrow`}
                />
              )}
            </button>

            {isLoggedIn && isAccountMenuOpen && (
              <div
                id="account-dropdown"
                className="menu__account-dropdown"
                role="menu"
              >
                <button className="menu__account-option" onClick={handleGoToProfile}>
                  Administrar perfil
                </button>
                <button className="menu__account-option" onClick={handleLogoutClick}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PANELS */}
        <div className="menu__panels" ref={panelsRef}>
          <div className="menu__panels-track" style={trackStyle}>
            {/* MAIN */}
            <div className="menu__panel" style={panelStyle}>
              <div className="menu__panel-scroll">
                <div className="menu__container-bottom">
                  <div className="menu__container-list">
                    {sections.map((section) => (
                      <div key={section.title} className="menu__section">
                        <h5 className="menu__section-title">{section.title}</h5>

                        {section.items.map((it) => {
                          const badge = getBadgeForLabel(it.label);

                          if (it.panel) {
                            return (
                              <button
                                key={it.label}
                                type="button"
                                className="menu__btn menu__btn--button"
                                onClick={() => openPanel(it.panel)}
                              >
                                <i className={`bi ${it.icon}`} />
                                <span className="menu__btn-label">{it.label}</span>
                                <i className="bi bi-chevron-right menu__rightchev" />
                              </button>
                            );
                          }

                          return (
                            <NavLink
                              key={it.label}
                              className={({ isActive }) =>
                                `menu__btn ${isActive ? "menu__btn--active" : ""}`
                              }
                              to={it.to}
                              onClick={closeAll}
                            >
                              <i className={`bi ${it.icon}`} />
                              <span className="menu__btn-label">{it.label}</span>

                              {/* ✅ badge */}
                              {badge !== null && (
                                <span className="menu__badge" aria-label={`${it.label}: ${badge}`}>
                                  {badge}
                                </span>
                              )}
                            </NavLink>
                          );
                        })}

                        <div className="menu__divider" />
                      </div>
                    ))}

                    {isAdmin && (
                      <div className="menu__section">
                        <button
                          type="button"
                          className="menu__accordion-btn"
                          onClick={() => setIsAdminOpen((p) => !p)}
                          aria-expanded={isAdminOpen}
                        >
                          <span>Administrador</span>
                          <i className={`bi bi-chevron-${isAdminOpen ? "up" : "down"}`} />
                        </button>

                        {isAdminOpen && (
                          <div className="menu__accordion-content">
                            {adminItems.map((it) => (
                              <NavLink
                                key={it.label}
                                className={({ isActive }) =>
                                  `menu__btn menu__btn--sub ${isActive ? "menu__btn--active" : ""}`
                                }
                                to={it.to}
                                onClick={closeAll}
                              >
                                <i className={`bi ${it.icon}`} />
                                {it.label}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SEARCH */}
            <div className="menu__panel" style={panelStyle}>
              <div className="menu__panel-scroll">
                <div className="menu__panel-header">
                  <h5 className="menu__panel-title">Buscar</h5>
                </div>

                <div className="menu__panel-content">
                  <MenuSearchLive
                    isActive={panel === PANELS.SEARCH}
                    categories={categories}
                    onPickProduct={(p, meta) => {
                      setIsOpen(false);

                      navigate(`/producto/${p._id}`, {
                        state: {
                          from: routerLocation.pathname + routerLocation.search,
                          msearch: { q: meta?.q || "" },
                        },
                      });
                    }}
                    onSeeAll={(query) => {
                      closeAll();
                      navigate(`/buscar?q=${encodeURIComponent(query)}`);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CATEGORIES */}
            <div className="menu__panel" style={panelStyle}>
              <div className="menu__panel-scroll">
                <div className="menu__panel-header">
                  <h5 className="menu__panel-title">Categorías</h5>
                </div>

                <div className="menu__panel-content">
                  <div className="menu__container-list">
                    {effectiveCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className="menu__btn menu__btn--button"
                        onClick={() => openSubcategories(cat)}
                      >
                        <i className={`bi ${cat.icono || "bi-tag"}`} />
                        {cat.nombre}
                        <i className="bi bi-chevron-right menu__rightchev" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SUBCATEGORIES */}
            <div className="menu__panel" style={panelStyle}>
              <div className="menu__panel-scroll">
                <div className="menu__panel-header">
                  <h5 className="menu__panel-title">
                    {selectedCategory?.nombre || "Subcategorías"}
                  </h5>
                </div>

                <div className="menu__panel-content">
                  <div className="menu__container-list">
                    {(selectedCategory?.subcategorias || []).map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        className="menu__btn menu__btn--button"
                        onClick={() => goToSubcategory(selectedCategory, sub)}
                      >
                        <i className="bi bi-chevron-right" />
                        {sub.nombre}
                      </button>
                    ))}

                    {!selectedCategory?.subcategorias?.length && (
                      <div className="menu__hint">
                        No hay subcategorías para esta categoría.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SOCIAL */}
        <div className="menu__container-social">
          <a
            className="menu__social"
            href="https://wa.me/598XXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp TechZone"
          >
            <i className="bi bi-whatsapp" />
          </a>
          <a
            className="menu__social"
            href="https://www.instagram.com/techzone"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram TechZone"
          >
            <i className="bi bi-instagram" />
          </a>
          <a
            className="menu__social"
            href="https://twitter.com/techzone"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X TechZone"
          >
            <i className="bi bi-twitter-x" />
          </a>
        </div>
      </aside>
    </>
  );
}

