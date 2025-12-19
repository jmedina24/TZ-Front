import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "../css/productDetail.css";
import ProductCardMini from "../subComponents/ProductCardMini";
import { cartService } from "../services/cartService";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

function formatPriceUYU(n) {
  const value = Number(n || 0);
  return value.toLocaleString("es-UY", { style: "currency", currency: "UYU" });
}

function calcFinalPrice(price, discountPercent) {
  const p = Number(price || 0);
  const d = Number(discountPercent || 0);
  if (!d) return p;
  return Math.round(p * (1 - d / 100));
}

function isNewByCreatedAt(createdAt, days = 30) {
  if (!createdAt) return true;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token"); // 👈 ajustá si tu key es otra
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export default function ProductDetail({ categories = [] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  // qty
  const [qty, setQty] = useState(1);

  // favoritos (desde BD)
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  // toast local (simple)
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
  const toastTimerRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // gallery
  const galleryRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const name = useMemo(() => {
    if (!product) return "";
    return `${product.brand || ""} ${product.model || ""}`.trim();
  }, [product]);

  const basePrice = product?.price ?? 0;
  const discount = product?.discount_percentaje ?? 0;
  const hasDiscount = Number(discount) > 0;
  const finalPrice = useMemo(
    () => calcFinalPrice(basePrice, discount),
    [basePrice, discount]
  );

  const sold = Number(product?.sold || 0);
  const stock = Number(product?.stock || 0);
  const isOut = stock <= 0;

  const isNew = isNewByCreatedAt(product?.createdAt, 30);

  const images = useMemo(() => {
    if (!product) return [];
    const arr = [];
    if (product.cover) arr.push(product.cover);
    if (Array.isArray(product.images))
      product.images.forEach((x) => x && arr.push(x));
    return [...new Set(arr)];
  }, [product]);

  const subCategoryName = useMemo(() => {
    if (!product?.subCategoryId) return "";
    const subId = product.subCategoryId;
    for (const cat of categories || []) {
      const sub = (cat.subcategorias || []).find((s) => s.id === subId);
      if (sub) return sub.nombre;
    }
    return product.subCategoryId;
  }, [product, categories]);

  const categoryName = useMemo(() => {
    if (!product?.categoryId) return "";
    const cat = (categories || []).find((c) => c.id === product.categoryId);
    return cat?.nombre || product.categoryId;
  }, [product, categories]);

  const clampQty = (n) => {
    const v = Math.max(1, Math.floor(Number(n || 1)));
    if (stock > 0) return Math.min(v, stock);
    return v;
  };

  useEffect(() => {
    setQty((q) => clampQty(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, id]);

  // fetch product
  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/product/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.msg || "Error obteniendo producto");
        if (!alive) return;

        setProduct(data);
        setQty(1);
        setActiveIndex(0);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [id]);

  // ✅ al entrar: consultar favoritos en BD y setear corazón
  useEffect(() => {
    let alive = true;

    async function loadFavourites() {
      if (!product?._id) return;

      const headers = getAuthHeaders();
      if (!headers) {
        if (alive) setIsFav(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/favorites`, {
          method: "GET",
          headers,
        });

        const data = await res.json();
        if (!res.ok) return;

        const favs = Array.isArray(data?.favorites) ? data.favorites : [];
        const exists = favs.some(
          (f) =>
            f?.productId?._id === product._id || f?.productId === product._id
        );

        if (alive) setIsFav(exists);
      } catch (e) {
        console.error(e);
      }
    }

    loadFavourites();
    return () => {
      alive = false;
    };
  }, [product?._id]);

  // fetch similares
  useEffect(() => {
    let alive = true;

    async function runSimilar() {
      if (!product?.categoryId) return;
      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/product/get`);
        const data = await res.json();
        if (!res.ok) return;

        const list = (data || [])
          .filter((p) => p.active !== false)
          .filter((p) => p._id !== product._id)
          .filter((p) => p.categoryId === product.categoryId)
          .slice(0, 12);

        if (alive) setSimilar(list);
      } catch (e) {
        console.error(e);
      }
    }

    runSimilar();
    return () => {
      alive = false;
    };
  }, [product]);

  // gallery activeIndex by scroll
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.getBoundingClientRect().width || 1;
      const idx = Math.round(el.scrollLeft / w);
      setActiveIndex(Math.max(0, Math.min(idx, images.length - 1)));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [images.length]);

  const scrollToIndex = (i) => {
    const el = galleryRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width || 1;
    el.scrollTo({ left: i * w, behavior: "smooth" });
  };

  const galleryPrev = () => scrollToIndex(Math.max(0, activeIndex - 1));
  const galleryNext = () =>
    scrollToIndex(Math.min(images.length - 1, activeIndex + 1));

  const canGalleryLeft = activeIndex > 0;
  const canGalleryRight =
    images.length > 0 ? activeIndex < images.length - 1 : false;

  // ✅ toggle fav contra BD
  const toggleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product?._id) return;

    const headers = getAuthHeaders();
    if (!headers) {
      showToast("Iniciá sesión para usar favoritos", "warning");
      return;
    }

    if (favBusy) return;
    setFavBusy(true);

    try {
      if (!isFav) {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/favorites`, {
          method: "POST",
          headers,
          body: JSON.stringify({ productId: product._id }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.msg || "No se pudo agregar a favoritos");

        setIsFav(true);
        showToast("Producto añadido a favoritos ✅", "success");
      } else {
        const res = await fetch(
          `${API_BASE_URL}${API_PREFIX}/user/favorites/${product._id}`,
          { method: "DELETE", headers }
        );
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.msg || "No se pudo quitar de favoritos");

        setIsFav(false);
        showToast("Se ha quitado el producto de favoritos ✅", "success");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Ocurrió un error", "error");
    } finally {
      setFavBusy(false);
    }
  };

  // ✅ carrito híbrido (suma cantidades si existe)
  const addToCart = async () => {
    if (!product || isOut) return;

    try {
      const q = clampQty(qty);
      await cartService.add(product._id, q);
      showToast(`Agregado al carrito (${q}) ✅`, "success");
    } catch (e) {
      showToast(e.message || "No se pudo agregar al carrito", "error");
    }
  };

  const decQty = () => setQty((q) => clampQty(Number(q || 1) - 1));
  const incQty = () => setQty((q) => clampQty(Number(q || 1) + 1));

  if (loading) {
    return (
      <div className="pd__page">
        <div className="pd__card pd__skeleton" />
        <div className="pd__card pd__skeleton" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pd__page">
        <div className="pd__card">
          <h3>No se pudo cargar el producto</h3>
          <button
            className="pd__btn pd__btn--primary"
            onClick={() => navigate("/")}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    const from = location.state?.from;
    const msearch = location.state?.msearch;

    if (from) {
      navigate(from, { state: { msearch } });
      return;
    }

    // fallback seguro si no hay historial
    if (window.history.length <= 1) {
      navigate("/");
      return;
    }

    navigate(-1);
  };

  return (
    <div className="pd__page">
      <button type="button" className="pd-back" onClick={handleBack}>
        <i className="bi bi-arrow-left"></i>
        Volver
      </button>

      {/* Toast */}
      {toast.show && (
        <div className={`tz-toast tz-toast--${toast.type}`}>
          <i
            className={`bi ${
              toast.type === "success"
                ? "bi-check-circle-fill"
                : toast.type === "warning"
                ? "bi-exclamation-triangle-fill"
                : "bi-x-circle-fill"
            }`}
          />
          <div className="tz-toast__text">{toast.msg}</div>
        </div>
      )}

      <div className="pd__card">
        {/* Meta */}
        <div className="pd__meta">
          <span className="pd__meta-new">{isNew ? "Nuevo" : "Nuevo"}</span>
          <span className="pd__meta-sep">|</span>
          <span className="pd__meta-sold">+ de {sold} vendidos</span>
        </div>

        <div className="pd__subcat">{subCategoryName || categoryName}</div>
        <h1 className="pd__title">{name}</h1>

        {/* Gallery */}
        <div className="pd__gallery">
          <button
            className={`pd__fav ${isFav ? "pd__fav--on" : ""}`}
            onClick={toggleFav}
            aria-label="Agregar a favoritos"
            type="button"
            disabled={favBusy}
          >
            <i className={`bi ${isFav ? "bi-heart-fill" : "bi-heart"}`} />
          </button>

          {images.length > 1 && canGalleryLeft && (
            <button
              className="pd__gArrow pd__gArrow--left"
              type="button"
              onClick={galleryPrev}
              aria-label="Foto anterior"
            >
              <i className="bi bi-chevron-left" />
            </button>
          )}

          {images.length > 1 && canGalleryRight && (
            <button
              className="pd__gArrow pd__gArrow--right"
              type="button"
              onClick={galleryNext}
              aria-label="Foto siguiente"
            >
              <i className="bi bi-chevron-right" />
            </button>
          )}

          <div className="pd__track" ref={galleryRef}>
            {images.map((src, i) => (
              <div className="pd__slide" key={`${src}-${i}`}>
                <img className="pd__img" src={src} alt={`${name} ${i + 1}`} />
              </div>
            ))}
          </div>

          {images.length > 1 && (
            <div className="pd__dots" aria-label="Galería">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`pd__dot ${
                    i === activeIndex ? "pd__dot--on" : ""
                  }`}
                  onClick={() => scrollToIndex(i)}
                  aria-label={`Ir a imagen ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="pd__priceBlock">
          {hasDiscount && (
            <div className="pd__priceOld">{formatPriceUYU(basePrice)}</div>
          )}

          <div className="pd__priceRow">
            <div
              className={`pd__priceFinal ${
                hasDiscount ? "pd__priceFinal--deal" : ""
              }`}
            >
              {formatPriceUYU(hasDiscount ? finalPrice : basePrice)}
            </div>
            {hasDiscount && (
              <span className="pd__offBadge">-{discount}% OFF</span>
            )}
          </div>

          <div className={`pd__stock ${isOut ? "pd__stock--out" : ""}`}>
            {isOut ? "Sin stock" : "Stock disponible"}
          </div>

          {/* ✅ Selector cantidad */}
          {!isOut && (
            <div className="pd__qtyRow">
              <span className="pd__qtyLabel">Cantidad</span>

              <div className="pd__qty">
                <button
                  type="button"
                  className="pd__qtyBtn"
                  onClick={decQty}
                  aria-label="Restar"
                  disabled={qty <= 1}
                >
                  <i className="bi bi-dash" />
                </button>

                <input
                  className="pd__qtyInput"
                  value={qty}
                  onChange={(e) =>
                    setQty(clampQty(e.target.value.replace(/[^\d]/g, "")))
                  }
                  inputMode="numeric"
                  aria-label="Cantidad"
                />

                <button
                  type="button"
                  className="pd__qtyBtn"
                  onClick={incQty}
                  aria-label="Sumar"
                  disabled={stock > 0 && qty >= stock}
                >
                  <i className="bi bi-plus" />
                </button>
              </div>

              <span className="pd__qtyHint">Máx: {stock}</span>
            </div>
          )}

          <button
            className="pd__btn pd__btn--primary"
            onClick={addToCart}
            disabled={isOut}
            type="button"
          >
            <i className="bi bi-cart" />
            Añadir al carrito
          </button>

          {/* Policies */}
          <div className="pd__policies">
            <div className="pd__policy">
              <i className="bi bi-arrow-counterclockwise" />
              <div>
                <strong>Devolución</strong>
                <div>Tenés 30 días para devolverlo.</div>
              </div>
            </div>

            <div className="pd__policy">
              <i className="bi bi-shield-check" />
              <div>
                <strong>Compra protegida</strong>
                <div>Te acompañamos ante cualquier inconveniente.</div>
              </div>
            </div>

            <div className="pd__policy">
              <i className="bi bi-truck" />
              <div>
                <strong>Envíos</strong>
                <div>Coordinamos entrega en todo Uruguay.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="pd__section">
          <h3 className="pd__sectionTitle">Descripción</h3>
          <p className="pd__desc">{product.description}</p>
        </div>

        {/* Similar */}
        <div className="pd__section">
          <div className="pd__sectionHead">
            <h3 className="pd__sectionTitle">Productos similares</h3>
            <button
              className="pd__linkBtn"
              type="button"
              onClick={() => navigate(`/categorias/${product.categoryId}`)}
            >
              Ver categoría <i className="bi bi-chevron-right" />
            </button>
          </div>

          {similar.length === 0 ? (
            <div className="pd__muted">
              No encontramos productos similares por ahora.
            </div>
          ) : (
            <div className="pd__carousel" aria-label="Productos similares">
              {similar.map((p) => (
                <ProductCardMini
                  key={p._id}
                  product={p}
                  onClick={() => navigate(`/producto/${p._id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
