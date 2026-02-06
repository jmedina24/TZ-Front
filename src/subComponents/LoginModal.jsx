import React, { useEffect, useState } from "react";
import "../css/loginModal.css";
import Portal from "../components/Portal";

const LoginModal = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onForgotPassword,
  onRegister,
  initialEmail = "",
}) => {
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(null); // { message, type }
  const [hasFieldError, setHasFieldError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(initialEmail || "");
    setPassword("");
    setShowPassword(false);
    setHasFieldError(false);
    setErrorMsg("");
    setToast(null);
  }, [isOpen, initialEmail]);

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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!isOpen) return null;

  const showError = (uiMessage, markFields = false) => {
    setErrorMsg(uiMessage);
    setToast({ message: uiMessage, type: "error" });
    setHasFieldError(markFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setShowPassword(false);
    setErrorMsg("");
    setHasFieldError(false);
    setToast(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:3977/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = data.msg || "";

        if (response.status === 401 && msg === "Usuario inactivo") {
          showError("Usuario no activo. Contacte al administrador del sistema");
        } else if (msg === "Usuario o contraseña incorrecto") {
          showError("Usuario o contraseña incorrecto", true);
        } else {
          showError("Ocurrió un error inesperado. Intente nuevamente más tarde");
        }
        return;
      }

      if (!data.token) {
        showError("Respuesta del servidor inválida (falta token)");
        return;
      }

      onLoginSuccess?.(data.token);

      setEmail("");
      setPassword("");
      setShowPassword(false);
      setHasFieldError(false);
      setErrorMsg("");
      setToast(null);
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
              <h2 className="login-modal__title">Iniciar sesión</h2>
              <button
                className="login-modal__close"
                onClick={onClose}
                disabled={isSubmitting}
                type="button"
              >
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
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <label className="floating-input__label">Contraseña</label>

                {password.length > 0 && (
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    title={showPassword ? "Ocultar" : "Mostrar"}
                    disabled={isSubmitting}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                  </button>
                )}
              </div>

              {errorMsg && <p className="login-modal__error-text">{errorMsg}</p>}

              <button
                type="button"
                className="login-modal__forgot"
                onClick={() => onForgotPassword?.()}
                disabled={isSubmitting}
              >
                ¿Olvidó su contraseña?
              </button>

              <button type="submit" className="login-modal__btn" disabled={isSubmitting}>
                {isSubmitting ? "Validando..." : "Entrar"}
              </button>

              <p className="login-modal__register">
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  className="login-modal__link-btn"
                  onClick={() => onRegister?.()}
                  disabled={isSubmitting}
                >
                  Crea una
                </button>
              </p>
            </form>
          </div>
        </div>
      </>
    </Portal>
  );
};

export default LoginModal;
