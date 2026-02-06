import React, { useEffect, useState } from "react";
import "../css/loginModal.css";
import Portal from "../components/Portal";

const API_BASE = "http://localhost:3977/api/v1/auth";

export default function ForgotPasswordModal({ isOpen, onClose, onGoToLogin }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState(null); // { message, type }
  const [errorMsg, setErrorMsg] = useState("");
  const [hasFieldError, setHasFieldError] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setIsSubmitting(false);
    setToast(null);
    setErrorMsg("");
    setHasFieldError(false);
  }, [isOpen]);

  // ESC + lock scroll
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showError = (msg, mark = false) => {
    setToast({ message: msg, type: "error" });
    setErrorMsg(msg);
    setHasFieldError(mark);
  };

  const showSuccess = (msg) => {
    setToast({ message: msg, type: "success" });
    setErrorMsg("");
    setHasFieldError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast(null);
    setErrorMsg("");
    setHasFieldError(false);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data.msg || "No se pudo enviar el email.", true);
        return;
      }

      showSuccess(data.msg || "Te enviamos un email para restablecer tu contraseña.");

      setTimeout(() => onGoToLogin?.(), 7000);
    } catch (err) {
      showError("No se pudo conectar con el servidor. Intente más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <>
        {toast && (
          <div
            className={
              "login-toast " +
              (toast.type === "success"
                ? "login-toast--success"
                : "login-toast--error")
            }
          >
            <i
              className={
                "bi " +
                (toast.type === "success"
                  ? "bi-check-circle-fill"
                  : "bi-exclamation-circle-fill")
              }
              style={{ fontSize: "1.3rem" }}
            />
            <span>{toast.message}</span>
          </div>
        )}

        <div
          className="login-modal__backdrop"
          onClick={() => (!isSubmitting ? onClose?.() : null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal__header">
              <h2 className="login-modal__title">Olvidé mi contraseña</h2>
              <button className="login-modal__close" onClick={onClose} disabled={isSubmitting} type="button">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="login-modal__form">
              <div className="floating-input">
                <input
                  type="email"
                  required
                  className={
                    "floating-input__field" +
                    (hasFieldError ? " floating-input__field--error" : "")
                  }
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                <label className="floating-input__label">Email</label>
              </div>

              {errorMsg && <p className="login-modal__error-text">{errorMsg}</p>}

              <button
                type="button"
                className="login-modal__forgot"
                onClick={onGoToLogin}
                disabled={isSubmitting}
              >
                ← Volver al login
              </button>

              <button type="submit" className="login-modal__btn" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          </div>
        </div>
      </>
    </Portal>
  );
}
