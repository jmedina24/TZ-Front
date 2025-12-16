// src/router/index.js o index.jsx
import React from "react";
import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layout/RootLayout";
import Home from "../pages/Home";
import Profile from "../pages/Profile";
import ResetPassword from "../pages/ResetPassword";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />, // ⬅️ nuestro layout con Header/Menu/Login
    children: [
      {
        index: true, // equivale a path: "/"
        element: <Home />,
      },
      {
        path: "perfil",
        element: <Profile />,
      },
      // 🔐 RESET PASSWORD (PÚBLICA)
      {
        path: "reset-password/:token",
        element: <ResetPassword />,
      },
    ],
  },
]);
