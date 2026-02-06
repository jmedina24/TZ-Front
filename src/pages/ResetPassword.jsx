// src/pages/ResetPassword.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "../css/loginModal.css";
import {
  passwordChecklist,
  passwordScore,
  isValidPassword,
} from "../utils/passwordRules";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const emailFromQuery = new URLSearchParams(location.search).get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPwInfo, setShowPwInfo] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    msg: "",
    type: "error", // error | success
  });

  const [loading, setLoading] = useState(false);

  // toast más tiempo (9s)
  const showToast = (msg, type = "error") => {
    setToast({ show: true, msg, type });
    clearTimeout(window.__rp_toast);
    window.__rp_toast = setTimeout(
      () => setToast({ show: false, msg: "", type: "error" }),
      9000
    );
  };

  useEffect(() => {
    // al cargar, aseguramos toggles en false
    setShowPassword(false);
    setShowConfirm(false);
    setShowPwInfo(false);
  }, []);

  const hasFieldError = useMemo(() => {
    if (!password && !confirm) return false;
    if (password && !isValidPassword(password)) return true;
    if (confirm && password !== confirm) return true;
    return false;
  }, [password, confirm]);

  const strengthLabel = (score) => {
    if (score <= 1) return "Débil";
    if (score === 2) return "Baja";
    if (score === 3) return "Media";
    if (score === 4) return "Fuerte";
    return "Muy fuerte";
  };

  const renderStrength = (pwd) => {
    const score = passwordScore(pwd);
    const pct = (score / 5) * 100;
    const level = Math.max(1, score);
    return (
      <div className="password-strength">
        <div className="password-strength__bar">
          <div
            className={`password-strength__fill password-strength__fill--${level}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="password-strength__text">Fortaleza: {strengthLabel(score)}</p>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // reset toggles/info al enviar
    setShowPassword(false);
    setShowConfirm(false);
    setShowPwInfo(false);

    if (!password.trim()) return showToast("Ingresá tu nueva contraseña");
    if (!isValidPassword(password))
      return showToast(
        "La contraseña no cumple los requisitos. Tocá el ícono de info para verlos."
      );
    if (password !== confirm) return showToast("Las contraseñas no coinciden");
    if (!token) return showToast("Token inválido");

    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}${API_PREFIX}/auth/reset-password/${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.msg || "No se pudo cambiar la contraseña");
        return;
      }

      showToast("Contraseña actualizada correctamente", "success");
      setSuccess(true);

      setTimeout(() => {
        const qs = new URLSearchParams();
        qs.set("reset", "1");
        if (emailFromQuery) qs.set("email", emailFromQuery);
        navigate(`/?${qs.toString()}`);
      }, 2000);
    } catch (err) {
      console.error(err);
      showToast("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast.show && (
        <div
          className={`login-toast ${
            toast.type === "success"
              ? "login-toast--success"
              : "login-toast--error"
          }`}
        >
          <i
            className={`bi ${
              toast.type === "success"
                ? "bi-check-circle-fill"
                : "bi-x-circle-fill"
            } login-toast__icon`}
          />
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="login-modal__backdrop">
        <div className="login-modal">
          <div className="login-modal__header">
            <h3 className="login-modal__title">Restablecer contraseña</h3>
            <button
              className="login-modal__close"
              onClick={() => navigate("/")}
              type="button"
              disabled={loading}
              title="Cerrar"
            >
              ✕
            </button>
          </div>

          {success ? (
            <div style={{ padding: 30, textAlign: "center" }}>
              <i
                className="bi bi-check-circle-fill"
                style={{ fontSize: 64, color: "#16a34a" }}
              />
              <h3 style={{ marginTop: 16, marginBottom: 6 }}>
                ¡Contraseña actualizada!
              </h3>
              <p style={{ margin: 0, color: "#555", lineHeight: 1.5 }}>
                En unos segundos serás redirigido al inicio.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login-modal__form">
              <div className="floating-input floating-input--with-toggle">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className={
                    "floating-input__field" +
                    (hasFieldError ? " floating-input__field--error" : "")
                  }
                  placeholder=" "
                  value={password}
                  disabled={loading || success}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setShowPwInfo(false)}
                />
                <label className="floating-input__label">Nueva contraseña</label>

                {/* ℹ️ info */}
                <button
                  type="button"
                  className="password-info"
                  onClick={() => setShowPwInfo((v) => !v)}
                  aria-label="Ver requisitos de contraseña"
                  title="Requisitos"
                  disabled={loading || success}
                >
                  <i className="bi bi-info-circle" />
                </button>

                {showPwInfo && (
                  <div
                    className="password-tooltip"
                    onMouseLeave={() => setShowPwInfo(false)}
                  >
                    <p className="password-tooltip__title">Requisitos</p>
                    <ul className="password-tooltip__list">
                      {passwordChecklist(password).map((r) => (
                        <li
                          key={r.key}
                          className={r.ok ? "password-tooltip__item--ok" : ""}
                        >
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 👁️ solo si hay texto */}
                {password.length > 0 && (
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((p) => !p)}
                    title={showPassword ? "Ocultar" : "Mostrar"}
                    disabled={loading || success}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                  </button>
                )}
              </div>

              {password.length > 0 && renderStrength(password)}

              <div className="floating-input floating-input--with-toggle">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  className={
                    "floating-input__field" +
                    (hasFieldError ? " floating-input__field--error" : "")
                  }
                  placeholder=" "
                  value={confirm}
                  disabled={loading || success}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <label className="floating-input__label">
                  Confirmar contraseña
                </label>

                {confirm.length > 0 && (
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirm((p) => !p)}
                    title={showConfirm ? "Ocultar" : "Mostrar"}
                    disabled={loading || success}
                  >
                    <i className={`bi ${showConfirm ? "bi-eye-slash" : "bi-eye"}`} />
                  </button>
                )}
              </div>

              <button
                className="login-modal__btn"
                disabled={loading || success}
                type="submit"
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
