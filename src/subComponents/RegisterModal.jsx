import React, { useEffect, useMemo, useState } from "react";
import "../css/loginModal.css";
import Portal from "../components/Portal";
import { passwordChecklist, passwordScore, isValidPassword } from "../utils/passwordRules";

const RegisterModal = ({ isOpen, onClose, onGoToLogin }) => {
  const [step, setStep] = useState(1);

  // STEP 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPwInfo, setShowPwInfo] = useState(false);

  // STEP 2
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [firstSurname, setFirstSurname] = useState("");
  const [secondSurname, setSecondSurname] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState(null); // { message, type }
  const [errorMsg, setErrorMsg] = useState("");
  const [hasFieldError, setHasFieldError] = useState(false);

  const API_BASE = "http://localhost:3977/api/v1/auth";

  const strength = useMemo(() => passwordScore(password), [password]);
  const passReq = useMemo(() => passwordChecklist(password), [password]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isOpen) return;

    setStep(1);

    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowPwInfo(false);

    setFirstName("");
    setMiddleName("");
    setFirstSurname("");
    setSecondSurname("");
    setBirthDate("");

    setToast(null);
    setErrorMsg("");
    setHasFieldError(false);
    setIsSubmitting(false);
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

  const handleCheckEmail = async (e) => {
    e.preventDefault();

    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowPwInfo(false);

    setToast(null);
    setErrorMsg("");
    setHasFieldError(false);
    setIsSubmitting(true);

    if (!isValidPassword(password)) {
      showError("La contraseña no cumple los requisitos. Tocá el ícono de info para verlos.", true);
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      showError("Las contraseñas no coinciden.", true);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showError(data.msg || "No se pudo verificar el E-Mail", true);
        return;
      }

      if (data.exists) {
        showError("Ya existe un usuario asociado a ese E-Mail.", true);
        return;
      }

      setStep(2);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setShowPwInfo(false);
    } catch (err) {
      showError("No se pudo conectar con el servidor. Intente más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowPwInfo(false);

    setToast(null);
    setErrorMsg("");
    setHasFieldError(false);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          middleName,
          firstSurname,
          secondSurname,
          birthDate,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          showError(data.errors.join(" • "), true);
        } else if (data.msg) {
          showError(data.msg, true);
        } else {
          showError("Ocurrió un error inesperado. Intente nuevamente más tarde");
        }
        return;
      }

      showSuccess(data.msg || "Registro exitoso. Revisá tu correo para activar la cuenta.");

      setTimeout(() => onGoToLogin?.(), 7000);
    } catch (err) {
      showError("No se pudo conectar con el servidor. Intente más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setToast(null);
    setErrorMsg("");
    setHasFieldError(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowPwInfo(false);
  };

  const strengthClass =
    strength.score <= 2 ? "rpw-fill--weak" : strength.score === 3 ? "rpw-fill--mid" : "rpw-fill--strong";

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
              <h2 className="login-modal__title">{step === 1 ? "Crear cuenta" : "Completar datos"}</h2>
              <button
                className="login-modal__close"
                onClick={onClose}
                disabled={isSubmitting}
                type="button"
              >
                ✕
              </button>
            </div>

            {step === 1 ? (
              <form onSubmit={handleCheckEmail} className="login-modal__form">
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

                <div className="floating-input lpw-field">
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
                    autoComplete="new-password"
                  />
                  <label className="floating-input__label">Contraseña</label>

                  <div className="lpw-icons">
                    <button
                      type="button"
                      className="lpw-icon-btn"
                      onClick={() => setShowPwInfo((v) => !v)}
                      aria-label="Ver requisitos de contraseña"
                      title="Requisitos"
                      disabled={isSubmitting}
                    >
                      <i className="bi bi-info-circle" />
                    </button>

                    {password.length > 0 && (
                      <button
                        type="button"
                        className="lpw-icon-btn"
                        onClick={() => setShowPassword((p) => !p)}
                        title={showPassword ? "Ocultar" : "Mostrar"}
                        disabled={isSubmitting}
                      >
                        <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                      </button>
                    )}
                  </div>

                  {showPwInfo && (
                    <>
                      <button
                        className="lpw-overlay"
                        type="button"
                        onClick={() => setShowPwInfo(false)}
                        aria-label="Cerrar requisitos"
                      />
                      <div className="lpw-popover">
                        <p className="lpw-popover__title">Requisitos</p>
                        <ul className="lpw-popover__list">
                          <li className={passReq.len ? "ok" : ""}>Mínimo 10 caracteres</li>
                          <li className={passReq.upper ? "ok" : ""}>Al menos una mayúscula</li>
                          <li className={passReq.lower ? "ok" : ""}>Al menos una minúscula</li>
                          <li className={passReq.num ? "ok" : ""}>Al menos un número</li>
                          <li className={passReq.special ? "ok" : ""}>Al menos un caracter especial</li>
                        </ul>
                      </div>
                    </>
                  )}

                  {password.length > 0 && (
                    <div className="rpw-strength">
                      <div className="rpw-bar">
                        <div className={`rpw-fill ${strengthClass}`} style={{ width: `${strength.percent}%` }} />
                      </div>
                      <p className="rpw-meta">Fortaleza: {strength.label}</p>
                    </div>
                  )}
                </div>

                <div className="floating-input lpw-field">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className={
                      "floating-input__field" +
                      (hasFieldError ? " floating-input__field--error" : "")
                    }
                    placeholder=" "
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <label className="floating-input__label">Confirmar contraseña</label>

                  {confirmPassword.length > 0 && (
                    <button
                      type="button"
                      className="lpw-icon-btn"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      title={showConfirmPassword ? "Ocultar" : "Mostrar"}
                      disabled={isSubmitting}
                    >
                      <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`} />
                    </button>
                  )}
                </div>

                {errorMsg && <p className="login-modal__error-text">{errorMsg}</p>}

                <button type="submit" className="login-modal__btn" disabled={isSubmitting}>
                  {isSubmitting ? "Verificando..." : "Continuar"}
                </button>

                <p className="login-modal__register">
                  ¿Ya tenés cuenta?{" "}
                  <button
                    type="button"
                    className="login-modal__link-btn"
                    onClick={onGoToLogin}
                    disabled={isSubmitting}
                  >
                    Iniciar sesión
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="login-modal__form">
                <div className="floating-input">
                  <input
                    type="text"
                    required
                    className={
                      "floating-input__field" +
                      (hasFieldError ? " floating-input__field--error" : "")
                    }
                    placeholder=" "
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <label className="floating-input__label">Primer nombre</label>
                </div>

                <div className="floating-input">
                  <input
                    type="text"
                    className="floating-input__field"
                    placeholder=" "
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <label className="floating-input__label">Segundo nombre (opcional)</label>
                </div>

                <div className="floating-input">
                  <input
                    type="text"
                    required
                    className={
                      "floating-input__field" +
                      (hasFieldError ? " floating-input__field--error" : "")
                    }
                    placeholder=" "
                    value={firstSurname}
                    onChange={(e) => setFirstSurname(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <label className="floating-input__label">Primer apellido</label>
                </div>

                <div className="floating-input">
                  <input
                    type="text"
                    required
                    className={
                      "floating-input__field" +
                      (hasFieldError ? " floating-input__field--error" : "")
                    }
                    placeholder=" "
                    value={secondSurname}
                    onChange={(e) => setSecondSurname(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <label className="floating-input__label">Segundo apellido</label>
                </div>

                <div className="floating-input">
                  <input
                    type="date"
                    required
                    className={
                      "floating-input__field floating-input__field--date" +
                      (hasFieldError ? " floating-input__field--error" : "")
                    }
                    placeholder=" "
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <label className="floating-input__label">Nacimiento</label>
                </div>

                {errorMsg && <p className="login-modal__error-text">{errorMsg}</p>}

                <button type="button" className="login-modal__forgot" onClick={handleBack} disabled={isSubmitting}>
                  ← Volver
                </button>

                <button type="submit" className="login-modal__btn" disabled={isSubmitting}>
                  {isSubmitting ? "Creando..." : "Crear cuenta"}
                </button>
              </form>
            )}
          </div>
        </div>
      </>
    </Portal>
  );
};

export default RegisterModal;
