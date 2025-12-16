import React from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../images/logo-desktop.png";
import "../css/header.css";

const Header = ({ onOpenMenu }) => {
  const { pathname } = useLocation();
  const hideMenu = pathname.startsWith("/reset-password");

  return (
    <div className="header">
      <div className="header__subcontainer">
        <div className="header__container-logo">
          <Link className="header__logo-btn" to="/">
            <img className="header__logo" src={Logo} alt="Logo TechZone" />
          </Link>
        </div>

        <div className="header__container-icons">
          {!hideMenu && (
            <div className="header__container-icons-menu">
              <button className="header__icon" onClick={onOpenMenu} type="button">
                <i className="hamburger bi bi-list"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
