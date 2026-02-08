// src/router/index.js o index.jsx
import React from "react";
import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layout/RootLayout";
import Home from "../pages/Home";
import Profile from "../pages/Profile";
import ResetPassword from "../pages/ResetPassword";
import ProductDetail from "../pages/ProductDetail";
import FavoritesPage from "../pages/FavoritesPage"; // 👈 NUEVO
import CartPage from "../pages/CartPage";
import CheckoutPage from "../pages/CheckoutPage";
import CheckoutPayPage from "../pages/CheckoutPayPage";
import CheckoutSuccessPage from "../pages/CheckoutSuccessPage";
import MyPurchasesPage from "../pages/MyPurchasesPage";
import PurchaseDetailPage from "../pages/PurchaseDetailPage";
import CategoryPage from "../pages/CategoryPage";
import NotificationsPage from "../pages/NotificationsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />, // ⬅️ layout con Header/Menu/Login
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "perfil",
        element: <Profile />,
      },
      {
        path: "favoritos",          // 👈 NUEVA RUTA FRONT
        element: <FavoritesPage />,
      },
      // 🔐 RESET PASSWORD (PÚBLICA)
      {
        path: "reset-password/:token",
        element: <ResetPassword />,
      },
      {
        path: "producto/:id",
        element: <ProductDetail />,
      },
      {
        path: "carrito",
        element: <CartPage />,
      },
      {
        path: "checkout",
        element: <CheckoutPage />,
      },
      {
        path: "checkout/pago",
        element: <CheckoutPayPage />,
      },
      {
        path: "checkout/confirmacion/:id",
        element: <CheckoutSuccessPage />,
      },
      {
        path: "mis-compras",
        element: <MyPurchasesPage />,
      },
      {
        path: "mis-compras/:id",
        element: <PurchaseDetailPage />,
      },
      {
        path: "categorias/:categoryId",
        element: <CategoryPage />,
      },
      {
        path: "notifications",
        element: <NotificationsPage />,
      },
    ],
  },
]);
