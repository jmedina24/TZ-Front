import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/loginModal.css";

const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    msg: "",
    type: "error", // error | success
  });

  const [loading, setLoading] = useState(false);

  const showToast = (msg, type = "error") => {
    setToast({ show: true, msg, type });
    clearTimeout(window.__rp_toast);
    window.__rp_toast = setTimeout(
      () => setToast({ show: false, msg: "", type: "error" }),
      2500
    );
  };

  const hasFieldError = useMemo(() => {
    if (!password && !confirm) return false;
    if (password && password.length < 8) return true;
    if (confirm && password !== confirm) return true;
    return false;
  }, [password, confirm]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) return showToast("Ingresá tu nueva contraseña");
    if (password.length < 8)
      return showToast("La contraseña debe tener al menos 8 caracteres");
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

      // ✅ ÉXITO
      showToast("Contraseña actualizada correctamente", "success");
      setSuccess(true);

      setTimeout(() => {
        navigate("/");
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
      {/* TOAST */}
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
              <div className="floating-input">
                <input
                  type="password"
                  required
                  className={
                    "floating-input__field" +
                    (hasFieldError ? " floating-input__field--error" : "")
                  }
                  placeholder=" "
                  value={password}
                  disabled={loading || success}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <label className="floating-input__label">Nueva contraseña</label>
              </div>

              <div className="floating-input">
                <input
                  type="password"
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
