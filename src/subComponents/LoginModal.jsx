// src/components/LoginModal.jsx
import React, { useState, useEffect } from "react";
import "../css/loginModal.css";

const LoginModal = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onForgotPassword,
  onRegister,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState(""); // por si querés mostrar error dentro del modal (opcional)
  const [toast, setToast] = useState(null); // { message: string }
  const [hasFieldError, setHasFieldError] = useState(false); // para el borde rojo

  // Autocierre del toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!isOpen) return null;

  const showError = (uiMessage, markFields = false) => {
    setErrorMsg(uiMessage);
    setToast({ message: uiMessage });
    setHasFieldError(markFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setHasFieldError(false);
    setToast(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:3977/api/v1/auth/login", {
        // 🔁 cambiá por la URL real de tu back
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Mapeamos según lo que envía tu back
        const msg = data.msg || "";

        if (response.status === 401 && msg === "Usuario inactivo") {
          // usuario inactivo
          showError(
            "Usuario no activo. Contacte al administrador del sistema"
          );
        } else if (msg === "Usuario o contraseña incorrecto") {
          showError("Usuario o contraseña incorrecto");
        } else {
          // cualquier otro error
          showError("Ocurrió un error inesperado. Intente nuevamente más tarde");
        }

        return; // cortamos acá, no seguimos al login OK
      }

      // Éxito -> tu back envía { token }
      if (!data.token) {
        showError("Respuesta del servidor inválida (falta token)");
        return;
      }

      onLoginSuccess && onLoginSuccess(data.token);

      // limpiamos campos (opcional)
      setEmail("");
      setPassword("");
      setHasFieldError(false);
      setErrorMsg("");
      setToast(null);
    } catch (err) {
      showError("No se pudo conectar con el servidor. Intente más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) onForgotPassword();
  };

  const handleRegister = () => {
    if (onRegister) onRegister();
  };

  return (
    <>
      {/* TOAST DE ERROR ARRIBA CENTRADO */}
      {toast && (
        <div className="login-toast login-toast--error">
          <i className="bi bi-exclamation-circle-fill login-toast__icon"></i>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="login-modal__backdrop">
        <div className="login-modal">
          <div className="login-modal__header">
            <h2 className="login-modal__title">Iniciar sesión</h2>
            <button className="login-modal__close" onClick={onClose}>
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
              />
              <label className="floating-input__label">Email</label>
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="floating-input__label">Contraseña</label>
            </div>

            {/* si querés además mostrar el texto dentro del modal */}
            {errorMsg && <p className="login-modal__error-text">{errorMsg}</p>}

            <button
              type="button"
              className="login-modal__forgot"
              onClick={handleForgotPassword}
            >
              ¿Olvidó su contraseña?
            </button>

            <button
              type="submit"
              className="login-modal__btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Validando..." : "Entrar"}
            </button>

            <p className="login-modal__register">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                className="login-modal__link-btn"
                onClick={handleRegister}
              >
                Crea una
              </button>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default LoginModal;
