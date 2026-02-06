// src/services/cartService.js
const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const LS_KEY = "tz_cart";

function getToken() {
  // Ajustalo a tu storage real (ej: "token" / "accessToken" / etc.)
  return localStorage.getItem("token");
}

function readLocalCart() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && x.productId)
      .map((x) => ({ productId: String(x.productId), qty: Math.max(1, Number(x.qty || 1)) }));
  } catch {
    return [];
  }
}

function writeLocalCart(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items || []));
}

function addOrSumLocal(productId, qty) {
  const q = Math.max(1, Math.floor(Number(qty || 1)));
  const cart = readLocalCart();
  const idx = cart.findIndex((x) => x.productId === String(productId));
  if (idx >= 0) cart[idx].qty = cart[idx].qty + q;
  else cart.push({ productId: String(productId), qty: q });
  writeLocalCart(cart);
  return cart;
}

async function apiFetch(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.msg || "Error");
  return data;
}

export const cartService = {
  // Para ProductDetail: suma qty si existe
  async add(productId, qty) {
    const token = getToken();
    if (!token) {
      const cart = addOrSumLocal(productId, qty);
      return { mode: "local", cart };
    }
    const data = await apiFetch("/user/cart", { method: "POST", body: { productId, qty } });
    return { mode: "server", cart: data.cart };
  },

  // Merge: llamalo después de login
  async mergeLocalToServer() {
    const token = getToken();
    if (!token) return { merged: false, reason: "no_token" };

    const localItems = readLocalCart();
    if (!localItems.length) return { merged: true, cart: null };

    const data = await apiFetch("/user/cart/merge", { method: "POST", body: { items: localItems } });

    // Vaciar local porque ya quedó en BD
    writeLocalCart([]);
    return { merged: true, cart: data.cart };
  },

  getLocalCart() {
    return readLocalCart();
  },

  clearLocalCart() {
    writeLocalCart([]);
  },
};
