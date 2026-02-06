import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useParams,
  useLocation,
  useOutletContext,
} from "react-router-dom";
import "../css/productDetail.css";
import StickyActions from "../subComponents/StickyActions";
import ProductCardMini from "../subComponents/ProductCardMini";
import { cartService } from "../services/cartService";
import ProductQuestions from "../subComponents/ProductQuestions";
import PaymentMethodsModal from "../subComponents/PaymentMethodsModal";



const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const moneyUSD = (n) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const calcFinalPrice = (price, discountPercent) => {
  const p = Number(price || 0);
  const d = Number(discountPercent || 0);
  if (!d) return p;
  return Math.round(p * (1 - d / 100));
};

const moneyUSD2 = (n) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);


const isNewByCreatedAt = (createdAt, days = 30) => {
  if (!createdAt) return true;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
};

function getAuthHeadersFromLocalStorage() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function lockBodyScroll(lock) {
  const body = document.body;
  if (!body) return;
  if (lock) {
    body.dataset.prevOverflow = body.style.overflow || "";
    body.style.overflow = "hidden";
  } else {
    body.style.overflow = body.dataset.prevOverflow || "";
    delete body.dataset.prevOverflow;
  }
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const outlet = useOutletContext?.() || {};
  const categories = outlet.categories || [];
  const showToastGlobal = outlet.showToast;

  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  // qty
  const [qty, setQty] = useState(1);

  // favoritos (desde BD)
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  // toast local (fallback si no hay showToast en layout)
  const [toast, setToast] = useState({
    show: false,
    msg: "",
    type: "success",
  });
  const toastTimerRef = useRef(null);

  const showToast = (msg, type = "success") => {
    if (typeof showToastGlobal === "function") {
      showToastGlobal(msg, type);
      return;
    }
    setToast({ show: true, msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      2200
    );
  };

  useEffect(() => {
    return () => toastTimerRef.current && clearTimeout(toastTimerRef.current);
  }, []);

  // ====== Gallery main ======
  const galleryRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // ====== Lightbox ======
  const [lbOpen, setLbOpen] = useState(false);
  const lbRef = useRef(null);
  const [lbIndex, setLbIndex] = useState(0);
  const [payOpen, setPayOpen] = useState(false);


  const name = useMemo(() => {
    if (!product) return "";
    return `${product.brand || ""} ${product.model || ""}`.trim();
  }, [product]);

  const basePrice = product?.price ?? 0;
  const discount = Number(product?.discount_percentaje ?? 0);
  const hasDiscount = discount > 0;

  const finalPrice = useMemo(
    () => calcFinalPrice(basePrice, discount),
    [basePrice, discount]
  );

  const priceToPay = hasDiscount ? finalPrice : basePrice;

  const installments = useMemo(() => {
    // 12 cuotas sin interés
    const v = Number(priceToPay) || 0;
    return v / 12;
  }, [priceToPay]);


  const sold = Number(product?.sold || 0);
  const stock = Number(product?.stock || 0);
  const isOut = stock <= 0;

  const isNew = isNewByCreatedAt(product?.createdAt, 30);

  // ✅ imágenes seguras + fallback placeholder
  const safeImages = useMemo(() => {
    const arr = [];
    if (product?.cover) arr.push(product.cover);
    if (Array.isArray(product?.images))
      product.images.forEach((x) => x && arr.push(x));

    const uniq = [...new Set(arr)].filter(Boolean);
    return uniq.length ? uniq : ["/img/placeholder-product.png"];
  }, [product]);

  const metaLabel = useMemo(() => {
    if (!product) return "";
    const subId = product?.subCategoryId;
    const catId = product?.categoryId;

    // subcat
    if (subId) {
      for (const cat of categories || []) {
        const sub = (cat.subcategorias || []).find((s) => s.id === subId);
        if (sub) return sub.nombre;
      }
    }

    // category
    if (catId) {
      const cat = (categories || []).find((c) => c.id === catId);
      return cat?.nombre || catId;
    }

    return "";
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
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.msg || "Error obteniendo producto");
        const p = data?.product || data; // soporta {product:{}} o {}
        if (!alive) return;

        setProduct(p || null);
        setQty(1);
        setActiveIndex(0);
      } catch (e) {
        console.error(e);
        if (alive) setProduct(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [id]);

  // favoritos: consultar
  useEffect(() => {
    let alive = true;

    async function loadFavourites() {
      if (!product?._id) return;

      const headers = getAuthHeadersFromLocalStorage();
      if (!headers) {
        if (alive) setIsFav(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/favorites`, {
          method: "GET",
          headers,
        });

        const data = await res.json().catch(() => ({}));
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
        const data = await res.json().catch(() => []);
        if (!res.ok) return;

        const list = (Array.isArray(data) ? data : [])
          .filter((p) => p?.active !== false)
          .filter((p) => p?._id !== product._id)
          .filter((p) => p?.categoryId === product.categoryId)
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

  // ====== helpers scrollToIndex por ref ======
  const scrollToIndex = (ref, i) => {
    const el = ref.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width || 1;
    el.scrollTo({ left: i * w, behavior: "smooth" });
  };

  // main activeIndex by scroll ✅ (usa safeImages.length)
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.getBoundingClientRect().width || 1;
      const idx = Math.round(el.scrollLeft / w);
      setActiveIndex(Math.max(0, Math.min(idx, safeImages.length - 1)));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [safeImages.length]);

  // lightbox lbIndex by scroll ✅ (usa safeImages.length)
  useEffect(() => {
    const el = lbRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.getBoundingClientRect().width || 1;
      const idx = Math.round(el.scrollLeft / w);
      setLbIndex(Math.max(0, Math.min(idx, safeImages.length - 1)));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [safeImages.length, lbOpen]);

  // open/close lightbox + lock scroll
  useEffect(() => {
    lockBodyScroll(lbOpen);
    return () => lockBodyScroll(false);
  }, [lbOpen]);

  const openLightbox = () => {
    if (!safeImages.length) return;
    setLbIndex(activeIndex);
    setLbOpen(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToIndex(lbRef, activeIndex);
      });
    });
  };

  const closeLightbox = () => setLbOpen(false);

  const galleryPrev = (e) => {
    e?.stopPropagation?.();
    scrollToIndex(galleryRef, Math.max(0, activeIndex - 1));
  };
  const galleryNext = (e) => {
    e?.stopPropagation?.();
    scrollToIndex(galleryRef, Math.min(safeImages.length - 1, activeIndex + 1));
  };

  const canGalleryLeft = activeIndex > 0;
  const canGalleryRight =
    safeImages.length > 0 ? activeIndex < safeImages.length - 1 : false;

  const handleBack = () => {
    const from = location.state?.from;
    const msearch = location.state?.msearch;

    if (from) {
      navigate(from, { state: { msearch } });
      return;
    }
    if (window.history.length <= 1) {
      navigate("/");
      return;
    }
    navigate(-1);
  };

  // toggle fav
  const toggleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product?._id) return;

    const headers = getAuthHeadersFromLocalStorage();
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
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data?.msg || "No se pudo agregar a favoritos");

        setIsFav(true);
        showToast("Producto añadido a favoritos ✅", "success");
      } else {
        const res = await fetch(
          `${API_BASE_URL}${API_PREFIX}/user/favorites/${product._id}`,
          { method: "DELETE", headers }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data?.msg || "No se pudo quitar de favoritos");

        setIsFav(false);
        showToast("Se quitó de favoritos ✅", "success");
      }
    } catch (err) {
      console.error(err);
      showToast(err?.message || "Ocurrió un error", "error");
    } finally {
      setFavBusy(false);
    }
  };

  // cart add
  const addToCart = async () => {
    if (!product || isOut) return;
    try {
      const q = clampQty(qty);
      await cartService.add(product._id, q);
      showToast(`Agregado al carrito (${q}) ✅`, "success");
    } catch (e) {
      showToast(e?.message || "No se pudo agregar al carrito", "error");
    }
  };

  const decQty = () => setQty((q) => clampQty(Number(q || 1) - 1));
  const incQty = () => setQty((q) => clampQty(Number(q || 1) + 1));

  if (loading) {
    return (
      <section className="pdPage">
        <div className="pdSkeleton" />
        <div className="pdSkeleton" />
      </section>
    );
  }

  if (!product) {
    return (
      <section className="pdPage">
        <div className="pdWrap">
          <div className="pdEmpty">
            <h3 className="pdEmpty__title">No se pudo cargar el producto</h3>
            <p className="pdEmpty__text">Probá volver al inicio y reintentar.</p>
            <button
              className="pdBtn pdBtn--primary"
              onClick={() => navigate("/")}
            >
              Volver al inicio
            </button>
          </div>
        </div>

        <StickyActions>
          <button
            className="pdStickyBtn pdStickyBtn--secondary"
            onClick={handleBack}
          >
            Volver
          </button>
          <button
            className="pdStickyBtn pdStickyBtn--primary"
            onClick={() => navigate("/")}
          >
            Volver al inicio
          </button>
        </StickyActions>
      </section>
    );
  }

  return (
    <section className="pdPage">
      {/* Toast fallback */}
      {toast.show && (
        <div className={`tzToast tzToast--${toast.type}`}>
          <i
            className={`bi ${toast.type === "success"
              ? "bi-check-circle-fill"
              : toast.type === "warning"
                ? "bi-exclamation-triangle-fill"
                : "bi-x-circle-fill"
              }`}
          />
          <div className="tzToast__text">{toast.msg}</div>
        </div>
      )}

      {/* ✅ TODO ARRIBA DE LA IMAGEN */}
      <div className="pdWrap">
        <div className="pdMeta">
          <span className="pdMeta__pill">{isNew ? "Nuevo" : "Producto"}</span>
          <span className="pdMeta__sep">|</span>
          <span className="pdMeta__muted">+ de {sold} vendidos</span>
        </div>

        {metaLabel ? <div className="pdSubcat">{metaLabel}</div> : null}
        <h1 className="pdH1">{name}</h1>
      </div>

      {/* ✅ GALERÍA FULL WIDTH */}
      <div className="pdGalleryFull">
        <div className="pdGallery">
          {/* ✅ Badge contador de fotos (estilo ML) */}
          <div className="pdCountBadge" aria-label="Cantidad de fotos">
            {activeIndex + 1}/{safeImages.length}
          </div>

          <button
            className={`pdFav ${isFav ? "pdFav--on" : ""}`}
            onClick={toggleFav}
            aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
            type="button"
            disabled={favBusy}
          >
            <i className={`bi ${isFav ? "bi-heart-fill" : "bi-heart"}`} />
          </button>

          {safeImages.length > 1 && canGalleryLeft && (
            <button
              className="pdArrow pdArrow--left"
              type="button"
              onClick={galleryPrev}
              aria-label="Foto anterior"
            >
              <i className="bi bi-chevron-left" />
            </button>
          )}

          {safeImages.length > 1 && canGalleryRight && (
            <button
              className="pdArrow pdArrow--right"
              type="button"
              onClick={galleryNext}
              aria-label="Foto siguiente"
            >
              <i className="bi bi-chevron-right" />
            </button>
          )}

          {/* ✅ click abre lightbox */}
          <div
            className="pdTrack"
            ref={galleryRef}
            onClick={openLightbox}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openLightbox();
            }}
            aria-label="Abrir galería en pantalla completa"
          >
            {safeImages.map((src, i) => (
              <div className="pdSlide" key={`${src}-${i}`}>
                <img className="pdImg" src={src} alt={`${name} ${i + 1}`} />
              </div>
            ))}
          </div>

          {safeImages.length > 1 && (
            <div className="pdDots" aria-label="Galería">
              {safeImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`pdDot ${i === activeIndex ? "pdDot--on" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToIndex(galleryRef, i);
                  }}
                  aria-label={`Ir a imagen ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ✅ CONTENIDO */}
      <div className="pdWrap">
        {/* Price */}
        <div className="pdPriceBlock">
          <div className="pdPriceOld">
            {hasDiscount ? moneyUSD(basePrice) : "\u00A0"}
          </div>

          <div className="pdPriceRow">
            <div className={`pdPriceFinal ${hasDiscount ? "pdPriceFinal--deal" : ""}`}>
              {moneyUSD(priceToPay)}
            </div>

            {hasDiscount && <span className="pdOffPill">-{discount}% OFF</span>}
          </div>

          {/* ✅ cuotas */}
          {!isOut && (
            <div className="pdInstallments" aria-label="Financiación">
              <strong>12 cuotas</strong> de{" "}
              <span className="pdInstallments__amount">{moneyUSD2(installments)}</span>{" "}
              <span className="pdInstallments__muted">sin interés</span>
            </div>
          )}

          {/* ✅ medios de pago (abre modal) */}
          <button type="button" className="pdPayLink" onClick={() => setPayOpen(true)}>
            <i className="bi bi-credit-card" />
            Medios de pago disponibles
            <i className="bi bi-chevron-right" />
          </button>

          <PaymentMethodsModal open={payOpen} onClose={() => setPayOpen(false)} />


          <div className={`pdStock ${isOut ? "pdStock--out" : ""}`}>
            {isOut ? "Sin stock" : "Stock disponible"}
          </div>

          {/* ✅ selector cantidad tipo carrito */}
          {!isOut && (
            <div className="pdQtyCartRow">
              <span className="pdQtyCartLabel">Cantidad</span>

              <div className="pdQtyCart" role="group" aria-label="Selector de cantidad">
                <button
                  type="button"
                  className="pdQtyCartBtn"
                  onClick={decQty}
                  aria-label="Restar"
                  disabled={qty <= 1}
                >
                  <i className="bi bi-dash" />
                </button>

                <div className="pdQtyCartValue" aria-label={`Cantidad seleccionada ${qty}`}>
                  {qty}
                </div>

                <button
                  type="button"
                  className="pdQtyCartBtn"
                  onClick={incQty}
                  aria-label="Sumar"
                  disabled={stock > 0 && qty >= stock}
                >
                  <i className="bi bi-plus" />
                </button>
              </div>

              <span className="pdQtyCartHint">Máx: {stock}</span>
            </div>
          )}

          <button
            className="pdBtn pdBtn--primary"
            onClick={addToCart}
            disabled={isOut}
            type="button"
          >
            <i className="bi bi-cart" />
            Añadir al carrito
          </button>

          {/* Policies */}
          <div className="pdPolicies">
            <div className="pdPolicy">
              <i className="bi bi-arrow-counterclockwise" />
              <div>
                <strong>Devolución</strong>
                <div>Tenés 30 días para devolverlo.</div>
              </div>
            </div>

            <div className="pdPolicy">
              <i className="bi bi-shield-check" />
              <div>
                <strong>Compra protegida</strong>
                <div>Te acompañamos ante cualquier inconveniente.</div>
              </div>
            </div>

            <div className="pdPolicy">
              <i className="bi bi-truck" />
              <div>
                <strong>Envíos</strong>
                <div>Coordinamos entrega en todo Uruguay.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="pdSection">
          <h3 className="pdSectionTitle">Descripción</h3>
          <p className="pdDesc">{product.description}</p>
        </div>



        <ProductQuestions productId={product._id} />



        {/* Similar */}
        <div className="pdSection">
          <div className="pdSectionHead">
            <h3 className="pdSectionTitle">Productos similares</h3>
            <button
              className="pdLinkBtn"
              type="button"
              onClick={() => navigate(`/categorias/${product.categoryId}`)}
            >
              Ver categoría <i className="bi bi-chevron-right" />
            </button>
          </div>

          {similar.length === 0 ? (
            <div className="pdMuted">
              No encontramos productos similares por ahora.
            </div>
          ) : (
            <div className="pdCarousel" aria-label="Productos similares">
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

      {/* ✅ Lightbox pantalla completa */}
      {lbOpen && (
        <div
          className="pdLb"
          role="dialog"
          aria-modal="true"
          aria-label="Galería en pantalla completa"
          onClick={closeLightbox}
        >
          <div className="pdLb__top" onClick={(e) => e.stopPropagation()}>
            <div className="pdLb__count">
              {lbIndex + 1}/{safeImages.length}
            </div>

            <button
              className="pdLb__close"
              type="button"
              onClick={closeLightbox}
              aria-label="Cerrar"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          <div
            className="pdLb__track"
            ref={lbRef}
            onClick={(e) => e.stopPropagation()}
          >
            {safeImages.map((src, i) => (
              <div className="pdLb__slide" key={`${src}-lb-${i}`}>
                <img className="pdLb__img" src={src} alt={`${name} ${i + 1}`} />
              </div>
            ))}
          </div>

          {safeImages.length > 1 && (
            <div className="pdLb__dots" onClick={(e) => e.stopPropagation()}>
              {safeImages.map((_, i) => (
                <button
                  key={`lb-dot-${i}`}
                  className={`pdLb__dot ${i === lbIndex ? "pdLb__dot--on" : ""
                    }`}
                  type="button"
                  onClick={() => scrollToIndex(lbRef, i)}
                  aria-label={`Ir a imagen ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ✅ Sticky bottom */}
      <StickyActions>
        <button
          className="pdStickyBtn pdStickyBtn--secondary"
          onClick={handleBack}
        >
          Volver
        </button>

        <button
          className="pdStickyBtn pdStickyBtn--primary"
          onClick={() => navigate("/")}
        >
          Volver al inicio
        </button>
      </StickyActions>
    </section>
  );
}
