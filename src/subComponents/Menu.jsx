import React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "../css/menu.css";

const Menu = ({isOpen, setIsOpen}) => {
const navigate = useNavigate();

const handleBack = () => {
    setIsOpen(false);
    navigate('/');
}

  return (
    <div className={`menu ${isOpen ? "open" : ""}`}>
      <div className="menu__subcontainer">
        <div className="menu__container-top">
          <div className="menu__container-back" onClick={handleBack}>
            <i className="bi bi-arrow-left"></i>
          </div>
          <div className="menu__container-user-info">
            <div className="menu__container-user-photo">
              <i className="bi bi-person-circle"></i>
            </div>
            <div className="menu__container-user-name">
              <p className="menu__user-name">Mi cuenta</p>
            </div>
            <div className="menu__container-arrows">
                <i class="bi bi-caret-up"></i>
                <i class="bi bi-caret-down"></i>
            </div>
          </div>
        </div>
        <div className="menu__container-bottom">
          <div className="menu__container-list">
            <h5>Menú</h5>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-house-door"></i>Inicio
            </Link>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-search"></i>Buscar Producto
            </Link>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-list-task"></i>Categorías
            </Link>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-lightning"></i>Más vendidos
            </Link>
            <br></br>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-cart"></i>Carrito de Compras
            </Link>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-heart"></i>Favoritos
            </Link>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-clock-history"></i>Mis Compras
            </Link>
            <br></br>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-envelope"></i>Contacto
            </Link>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-info-circle"></i>Preguntas Frecuentes
            </Link>
            <br></br>
            <h5>Menú de Administrador</h5>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-currency-dollar"></i>Gestionar Ventas
            </Link>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-box-seam"></i>Gestionar Productos
            </Link>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-bookmark"></i>Gestionar Categorías
            </Link>
            <Link className="menu__btn" to='#'>
              <i class="bi bi-people"></i>Gestionar Usuarios
            </Link>
          </div>
        </div>
        <div className="menu__container-social">
          <Link className="menu__social">
            <i class="bi bi-whatsapp"></i>
          </Link>
          <Link className="menu__social">
            <i class="bi bi-instagram"></i>
          </Link>
          <Link className="menu__social">
            <i class="bi bi-twitter-x"></i>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Menu;
