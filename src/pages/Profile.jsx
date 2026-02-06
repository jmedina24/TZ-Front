// src/pages/Profile.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import EditModal from "../subComponents/EditModal";
import CardPreview from "../subComponents/CardPreview";
import "../css/profile.css";
import visa from "../assets/visa.svg";
import mc from "../assets/mastercard.svg";
import amex from "../assets/amex.svg";
import ConfirmModal from "../subComponents/ConfirmModal";

// ✅ NUEVO: reglas de contraseña (front)
import {
  isValidPassword,
  passwordChecklist,
  passwordScore,
} from "../utils/passwordRules";


const API_BASE_URL = "http://localhost:3977";
const API_PREFIX = "/api/v1";

const Profile = () => {
  const { user, token, setUser } = useOutletContext() || {};

  const [openSection, setOpenSection] = useState("personal");

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    loading: false,
    onConfirm: null,
  });

  // evita spamear warning por tarjetas vencidas
  const warnedExpiredCards = useRef(false);

  // ===== Toast unificado =====
  const [toast, setToast] = useState({
    show: false,
    msg: "",
    type: "success", // success | error | warning
  });

  const showToast = useCallback((msg, type = "success") => {
    setToast({ show: true, msg, type });
    clearTimeout(window.__tz_toast);
    window.__tz_toast = setTimeout(() => {
      setToast({ show: false, msg: "", type: "success" });
    }, 2500);
  }, []);

  const showSuccessToast = useCallback(
    (msg = "Datos actualizados") => showToast(msg, "success"),
    [showToast]
  );

  const showErrorToast = useCallback(
    (msg = "Ocurrió un error") => showToast(msg, "error"),
    [showToast]
  );

  const showWarningToast = useCallback(
    (msg = "Atención") => showToast(msg, "warning"),
    [showToast]
  );

  // Upload avatar
  const [isUploading, setIsUploading] = useState(false);

  // ===== DATOS PERSONALES =====
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  const [personalForm, setPersonalForm] = useState({
    firstName: "",
    middleName: "",
    firstSurname: "",
    secondSurname: "",
    birthDate: "",
  });

  // ===== PHONES =====
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isDeletingPhone, setIsDeletingPhone] = useState(false);
  const [phoneMode, setPhoneMode] = useState("add"); // add | edit
  const [selectedPhoneId, setSelectedPhoneId] = useState("");
  const emptyPhone = { type: "Celular", number: "" };
  const [phoneForm, setPhoneForm] = useState(emptyPhone);

  // ===== ADDRESSES =====
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  const [addressMode, setAddressMode] = useState("add"); // add | edit
  const [selectedAddressId, setSelectedAddressId] = useState("");

  const emptyAddress = {
    reference: "Casa",
    street: "",
    number: "",
    city: "",
    department: "",
    postalCode: "",
  };
  const [addressForm, setAddressForm] = useState(emptyAddress);

  // ===== CARDS (tarjetas) =====
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [cardMode, setCardMode] = useState("add"); // add | edit
  const [selectedCardId, setSelectedCardId] = useState("");

  const emptyCard = {
    holderName: "",
    number: "",
    expiry: "", // MM/YY
    cvv: "",
    bank: "",
  };
  const [cardForm, setCardForm] = useState(emptyCard);

  // ===== SEGURIDAD (MODALS) =====
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isSendingRecover, setIsSendingRecover] = useState(false);

  const [changePassForm, setChangePassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [recoverEmail, setRecoverEmail] = useState(user?.email || "");

  // ✅ NUEVO: show/hide + info
  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);
  const [showPassInfo, setShowPassInfo] = useState(false);

  // ⚠️ Ajustá este endpoint según tu back
  const CHANGE_PASSWORD_URL = `${API_BASE_URL}${API_PREFIX}/auth/change-password`;
  // Ya lo tenés en tu API:
  const FORGOT_PASSWORD_URL = `${API_BASE_URL}${API_PREFIX}/auth/forgot-password`;

  const handleChangePassField = (e) => {
    const { name, value } = e.target;
    setChangePassForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecoverEmailChange = (e) => setRecoverEmail(e.target.value);

  // ✅ computed: requisitos + fuerza
  const passReq = useMemo(() => {
    return passwordChecklist(changePassForm.newPassword || "");
  }, [changePassForm.newPassword]);

  const strength = useMemo(() => {
    return passwordScore(changePassForm.newPassword || "");
  }, [changePassForm.newPassword]);

  const strengthScore = strength.score;
  const strengthPct = strength.percent;
  const strengthLabel = strength.label;


  // ✅ borde rojo en inputs si hay error
  const hasFieldError = useMemo(() => {
    const { currentPassword, newPassword, confirmNewPassword } = changePassForm;

    if (!currentPassword && !newPassword && !confirmNewPassword) return false;

    if (newPassword && !isValidPassword(newPassword)) return true;
    if (confirmNewPassword && newPassword !== confirmNewPassword) return true;

    return false;
  }, [changePassForm]);

  const closeChangePassModal = () => {
    setIsChangePassOpen(false);
    setChangePassForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });

    // ✅ reset iconos / popover
    setShowCurPass(false);
    setShowNewPass(false);
    setShowConfPass(false);
    setShowPassInfo(false);
  };

  const closeForgotModal = () => {
    setIsForgotOpen(false);
  };

  const handleSubmitChangePassword = async () => {
    const { currentPassword, newPassword, confirmNewPassword } = changePassForm;

    if (!currentPassword.trim())
      return showErrorToast("Ingresá tu contraseña actual");

    if (!newPassword.trim())
      return showErrorToast("Ingresá tu nueva contraseña");

    if (!isValidPassword(newPassword))
      return showErrorToast(
        "La nueva contraseña no cumple los requisitos mínimos."
      );

    if (newPassword !== confirmNewPassword)
      return showErrorToast("Las contraseñas no coinciden");

    setIsChangingPass(true);

    try {
      const res = await fetch(CHANGE_PASSWORD_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast(data.msg || "No se pudo cambiar la contraseña");
        return;
      }

      showSuccessToast("Contraseña actualizada");
      closeChangePassModal();
    } catch (err) {
      console.error(err);
      showErrorToast("Error de conexión");
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSubmitForgotPassword = async () => {
    const email = (recoverEmail || "").trim();
    if (!email) return showErrorToast("Ingresá un email");

    setIsSendingRecover(true);

    try {
      const res = await fetch(FORGOT_PASSWORD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast(data.msg || "No se pudo enviar el email");
        return;
      }

      showSuccessToast("Te enviamos un email de recuperación");
      closeForgotModal();
    } catch (err) {
      console.error(err);
      showErrorToast("Error de conexión");
    } finally {
      setIsSendingRecover(false);
    }
  };

  // URLs tarjetas
  const CARD_ADD_URL = `${API_BASE_URL}${API_PREFIX}/user/addcard`;
  const CARD_UPDATE_URL = (id) =>
    `${API_BASE_URL}${API_PREFIX}/user/updatecard/${id}`;
  const CARD_DELETE_URL = (id) =>
    `${API_BASE_URL}${API_PREFIX}/user/deletecard/${id}`;

  // ===== Helpers =====
  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  const openConfirm = ({ title, message, onConfirm }) => {
    setConfirmState({
      open: true,
      title,
      message,
      loading: false,
      onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmState({
      open: false,
      title: "",
      message: "",
      loading: false,
      onConfirm: null,
    });
  };

  const formatBirthDateUTC = (dateValue) => {
    if (!dateValue) return "-";
    return new Intl.DateTimeFormat("es-UY", { timeZone: "UTC" }).format(
      new Date(dateValue)
    );
  };

  const onlyDigits = (s = "") => s.replace(/\D/g, "");

  const formatCardNumber = (value) => {
    const digits = onlyDigits(value).slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const maskCardNumber = (value) => {
    const digits = onlyDigits(value);
    if (!digits) return "-";
    const last4 = digits.slice(-4);
    return `**** **** **** ${last4}`;
  };

  const formatExpiry = (value) => {
    const digits = onlyDigits(value).slice(0, 4); // MMYY
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const detectCardBrand = (number = "") => {
    const digits = number.replace(/\D/g, "");
    if (/^4/.test(digits)) return "visa";
    if (/^5[1-5]/.test(digits)) return "mastercard";
    if (/^3[47]/.test(digits)) return "amex";
    return "generic";
  };

  const brandToSchemaType = (brand) => {
    if (brand === "visa") return "Visa";
    if (brand === "mastercard") return "MasterCard";
    if (brand === "amex") return "AMEX";
    return "Visa";
  };

  const isExpired = (month, year) => {
    const m = Number(month);
    let y = Number(year);
    if (!m || !y) return false;
    if (y < 100) y += 2000;

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;

    if (y < curY) return true;
    if (y === curY && m < curM) return true;
    return false;
  };

  const parseExpiry = (expiry) => {
    const [mm, yy] = (expiry || "").split("/");
    const expMonth = Number(mm);
    const expYear = yy ? Number(`20${yy}`) : NaN;
    return { expMonth, expYear };
  };

  const refreshCards = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/getcard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const cards = Array.isArray(data) ? data : data.cards;

      if (Array.isArray(cards)) {
        setUser((prev) => ({ ...prev, cards }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) return;

    setPersonalForm({
      firstName: user.firstName || "",
      middleName: user.middleName || "",
      firstSurname: user.firstSurname || "",
      secondSurname: user.secondSurname || "",
      birthDate: user.birthDate
        ? new Date(user.birthDate).toISOString().slice(0, 10)
        : "",
    });

    if (user?.addresses?.length) setSelectedAddressId(user.addresses[0]._id);
    else setSelectedAddressId("");
  }, [user]);

  useEffect(() => {
    if (token) refreshCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!user?.cards?.length) return;

    const hasExpired = user.cards.some((c) =>
      isExpired(c.expirationMonth, c.expirationYear)
    );

    if (hasExpired && !warnedExpiredCards.current) {
      warnedExpiredCards.current = true;
      showWarningToast("Tenés tarjetas vencidas. Te recomendamos eliminarlas.");
    }
  }, [user?.cards, showWarningToast]);

  if (!user || !token)
    return <p className="profile-page">Debes iniciar sesión.</p>;

  const avatarUrl = user.avatar ? `${API_BASE_URL}/${user.avatar}` : null;

  const hasExpiredCards = (user?.cards || []).some((c) =>
    isExpired(c.expirationMonth, c.expirationYear)
  );

  // ====== PERSONAL ======
  const handlePersonalChange = (e) => {
    const { name, value } = e.target;
    setPersonalForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSavePersonal = async () => {
    setIsSavingPersonal(true);

    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/updateme`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: personalForm.firstName,
          middleName: personalForm.middleName,
          firstSurname: personalForm.firstSurname,
          secondSurname: personalForm.secondSurname,
          birthDate: personalForm.birthDate || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast(data.msg || "Error al actualizar datos personales");
        return;
      }

      setUser(data);
      showSuccessToast("Datos personales actualizados");
      setIsPersonalModalOpen(false);
    } catch (err) {
      console.error(err);
      showErrorToast("Error de conexión");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // ====== AVATAR ======
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/user/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast(data.msg || "Error al actualizar la foto de perfil");
        return;
      }

      if (data.avatar) setUser((prev) => ({ ...prev, avatar: data.avatar }));
      else if (data._id) setUser(data);

      showSuccessToast("Foto de perfil actualizada");
    } catch (err) {
      console.error(err);
      showErrorToast("Error de conexión");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  // ====== PHONES ======
  const openAddPhone = () => {
    setPhoneMode("add");
    setSelectedPhoneId("");
    setPhoneForm(emptyPhone);
    setIsPhoneModalOpen(true);
  };

  const openEditPhone = (p) => {
    setPhoneMode("edit");
    setSelectedPhoneId(p._id);
    setPhoneForm({ type: p.type || "Celular", number: p.number || "" });
    setIsPhoneModalOpen(true);
  };

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    setPhoneForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSavePhone = async () => {
    setIsSavingPhone(true);

    try {
      if (!phoneForm.number.trim()) {
        showErrorToast("El número es obligatorio");
        return;
      }

      const url =
        phoneMode === "add"
          ? `${API_BASE_URL}${API_PREFIX}/user/addphone`
          : `${API_BASE_URL}${API_PREFIX}/user/updatephone/${selectedPhoneId}`;

      const method = phoneMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: phoneForm.type,
          number: phoneForm.number,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast(data.msg || "Error al guardar el teléfono");
        return;
      }

      if (data.phones) setUser((prev) => ({ ...prev, phones: data.phones }));

      showSuccessToast("Teléfono guardado");
      setIsPhoneModalOpen(false);
    } catch (err) {
      console.error(err);
      showErrorToast("Error de conexión");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleDeletePhone = (phoneId) => {
    openConfirm({
      title: "Eliminar teléfono",
      message: "¿Estás seguro de que querés eliminar este teléfono?",
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, loading: true }));
        setIsDeletingPhone(true);

        try {
          const res = await fetch(
            `${API_BASE_URL}${API_PREFIX}/user/deletephone/${phoneId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            showErrorToast(data.msg || "Error al eliminar el teléfono");
            return;
          }

          if (data.phones) {
            setUser((prev) => ({ ...prev, phones: data.phones }));
          }

          showSuccessToast("Teléfono eliminado");
          closeConfirm();
        } catch (err) {
          console.error(err);
          showErrorToast("Error de conexión");
        } finally {
          setIsDeletingPhone(false);
          setConfirmState((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // ====== ADDRESSES ======
  const openAddAddress = () => {
    setAddressMode("add");
    setSelectedAddressId("");
    setAddressForm(emptyAddress);
    setIsAddressModalOpen(true);
  };

  const openEditAddress = (addr) => {
    setAddressMode("edit");
    setSelectedAddressId(addr._id);
    setAddressForm({
      reference: addr.reference || "Casa",
      street: addr.street || "",
      number: addr.number || "",
      city: addr.city || "",
      department: addr.department || "",
      postalCode: addr.postalCode || "",
    });
    setIsAddressModalOpen(true);
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveAddress = async () => {
    setIsSavingAddress(true);

    try {
      if (
        !addressForm.street.trim() ||
        !addressForm.city.trim() ||
        !addressForm.department.trim()
      ) {
        showErrorToast("Completá al menos Calle, Ciudad y Departamento");
        return;
      }

      const url =
        addressMode === "add"
          ? `${API_BASE_URL}${API_PREFIX}/user/addaddress`
          : `${API_BASE_URL}${API_PREFIX}/user/updateaddress/${selectedAddressId}`;

      const method = addressMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addressForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast(data.msg || "Error al guardar la dirección");
        return;
      }

      if (data.addresses)
        setUser((prev) => ({ ...prev, addresses: data.addresses }));

      showSuccessToast("Dirección guardada");
      setIsAddressModalOpen(false);
    } catch (err) {
      console.error(err);
      showErrorToast("Error de conexión");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = (addrId) => {
    openConfirm({
      title: "Eliminar dirección",
      message: "¿Estás seguro de que querés eliminar esta dirección?",
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, loading: true }));
        setIsDeletingAddress(true);

        try {
          const res = await fetch(
            `${API_BASE_URL}${API_PREFIX}/user/deleteaddress/${addrId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            showErrorToast(data.msg || "Error al eliminar la dirección");
            return;
          }

          if (data.addresses) {
            setUser((prev) => ({ ...prev, addresses: data.addresses }));
          }

          showSuccessToast("Dirección eliminada");
          closeConfirm();
        } catch (err) {
          console.error(err);
          showErrorToast("Error de conexión");
        } finally {
          setIsDeletingAddress(false);
          setConfirmState((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // ====== CARDS ======
  const openAddCard = () => {
    if (hasExpiredCards && !warnedExpiredCards.current) {
      warnedExpiredCards.current = true;
      showWarningToast("Tenés tarjetas vencidas. Te recomendamos eliminarlas.");
    }

    setCardMode("add");
    setSelectedCardId("");
    setCardForm(emptyCard);
    setIsCardModalOpen(true);
  };

  const openEditCard = (c) => {
    const expired = isExpired(c.expirationMonth, c.expirationYear);
    if (expired) {
      showWarningToast("Esta tarjeta está vencida. Eliminála para continuar.");
      return;
    }

    setCardMode("edit");
    setSelectedCardId(c._id);

    const mm = String(c.expirationMonth || "").padStart(2, "0");
    const yy = String(c.expirationYear || "").slice(-2);

    setCardForm({
      holderName: c.cardHolder || "",
      number: c.cardNumber ? formatCardNumber(c.cardNumber) : "",
      expiry: mm && yy ? `${mm}/${yy}` : "",
      cvv: "",
      bank: c.bank || "",
    });

    setIsCardModalOpen(true);
  };

  const handleCardChange = (e) => {
    const { name, value } = e.target;

    if (name === "number") {
      setCardForm((prev) => ({ ...prev, number: formatCardNumber(value) }));
      return;
    }
    if (name === "expiry") {
      setCardForm((prev) => ({ ...prev, expiry: formatExpiry(value) }));
      return;
    }
    if (name === "cvv") {
      setCardForm((prev) => ({ ...prev, cvv: onlyDigits(value).slice(0, 4) }));
      return;
    }

    setCardForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCard = async () => {
    setIsSavingCard(true);

    try {
      const digits = onlyDigits(cardForm.number);

      if (!cardForm.holderName.trim()) {
        showErrorToast("El titular es obligatorio");
        return;
      }

      if (digits.length !== 16) {
        showErrorToast("La tarjeta debe tener 16 dígitos");
        return;
      }

      const { expMonth, expYear } = parseExpiry(cardForm.expiry);
      if (!expMonth || expMonth < 1 || expMonth > 12 || !expYear) {
        showErrorToast("Vencimiento inválido");
        return;
      }

      if (isExpired(expMonth, expYear)) {
        showErrorToast("La tarjeta está vencida. Ingresá un vencimiento válido");
        return;
      }

      if (!cardForm.cvv || cardForm.cvv.length < 3) {
        showErrorToast("Código de seguridad inválido");
        return;
      }

      const brand = detectCardBrand(cardForm.number);
      const payload = {
        cardNumber: digits,
        cardHolder: cardForm.holderName.trim(),
        expirationMonth: expMonth,
        expirationYear: expYear,
        securityCode: Number(cardForm.cvv),
        type: brandToSchemaType(brand),
        bank: cardForm.bank || "",
      };

      const url =
        cardMode === "add" ? CARD_ADD_URL : CARD_UPDATE_URL(selectedCardId);
      const method = cardMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast(data.msg || "Error al guardar la tarjeta");
        return;
      }

      await refreshCards();
      showSuccessToast(cardMode === "add" ? "Tarjeta agregada" : "Tarjeta actualizada");
      setIsCardModalOpen(false);
    } catch (err) {
      console.error(err);
      showErrorToast("Error de conexión");
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    setIsDeletingCard(true);

    try {
      const res = await fetch(CARD_DELETE_URL(cardId), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showErrorToast(data.msg || "Error al eliminar la tarjeta");
        return false;
      }

      await refreshCards();
      showSuccessToast("Tarjeta eliminada");
      return true;
    } catch (err) {
      console.error(err);
      showErrorToast("Error de conexión");
      return false;
    } finally {
      setIsDeletingCard(false);
    }
  };

  const cardBrandAssets = {
    Visa: { src: visa, label: "Visa" },
    MasterCard: { src: mc, label: "MasterCard" },
    AMEX: { src: amex, label: "AMEX" },
  };

  const getCardBrandUI = (type) => {
    const key = (type || "").trim();
    return cardBrandAssets[key] || { src: null, label: key || "Tarjeta" };
  };

  const requestDeleteCard = (cardId) => {
    openConfirm({
      title: "Eliminar tarjeta",
      message: "¿Seguro que querés eliminar esta tarjeta? Esta acción no se puede deshacer.",
      onConfirm: async () => {
        setConfirmState((p) => ({ ...p, loading: true }));
        const ok = await handleDeleteCard(cardId);
        if (ok) closeConfirm();
        else setConfirmState((p) => ({ ...p, loading: false }));
      },
    });
  };

  return (
    <div className="profile-page">
      {/* Toast success/error/warning */}
      {toast.show && (
        <div
          className={`tz-toast ${toast.type === "success"
            ? "tz-toast--success"
            : toast.type === "error"
              ? "tz-toast--error"
              : "tz-toast--warning"
            }`}
        >
          <i
            className={`bi ${toast.type === "success"
              ? "bi-check-circle-fill"
              : toast.type === "error"
                ? "bi-x-circle-fill"
                : "bi-exclamation-triangle-fill"
              } tz-toast__icon`}
          ></i>
          <span className="tz-toast__text">{toast.msg}</span>
        </div>
      )}

      <h2>Mi perfil</h2>

      {/* HEADER */}
      <div className="profile-header">
        <div className="profile-header-left">
          <div className="profile-avatar-wrapper profile-avatar-editable">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="profile-avatar-img" />
            ) : (
              <i className="bi bi-person-circle profile-avatar-placeholder"></i>
            )}

            <label className="profile-avatar-overlay" title="Cambiar foto">
              <i className="bi bi-camera-fill"></i>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                hidden
                disabled={isUploading}
              />
            </label>

            {isUploading && (
              <div className="profile-avatar-loading">
                <i className="bi bi-arrow-repeat"></i>
              </div>
            )}
          </div>

          <div className="profile-header-info">
            <h3 className="profile-header-name">
              {(user.firstName || "Usuario") + " " + (user.firstSurname || "")}
            </h3>
            <p className="profile-header-email" title={user.email}>
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* ===== DATOS PERSONALES ===== */}
      <section
        className={`profile-section ${openSection === "personal" ? "profile-section--active" : ""
          }`}
      >
        <button
          className={`profile-section__header ${openSection === "personal" ? "profile-section__header--active" : ""
            }`}
          onClick={() => toggleSection("personal")}
        >
          <span>
            <i className="bi bi-person"></i> Datos personales
          </span>
          <i className={`bi bi-chevron-${openSection === "personal" ? "up" : "down"}`} />
        </button>

        {openSection === "personal" && (
          <div className="profile-section__body">
            <div className="profile-section__body-header">
              <span className="profile-section__body-title">Información básica</span>
              <button
                className="profile-button profile-button--secondary"
                onClick={() => setIsPersonalModalOpen(true)}
                type="button"
              >
                Editar
              </button>
            </div>

            <div className="profile-field">
              <span className="profile-label">Nombre</span>
              <span className="profile-value">{user.firstName || "-"}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label">Segundo nombre</span>
              <span className="profile-value">{user.middleName || "-"}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label">Primer apellido</span>
              <span className="profile-value">{user.firstSurname || "-"}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label">Segundo apellido</span>
              <span className="profile-value">{user.secondSurname || "-"}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label">Fecha de nacimiento</span>
              <span className="profile-value">{formatBirthDateUTC(user.birthDate)}</span>
            </div>
          </div>
        )}
      </section>

      <EditModal
        isOpen={isPersonalModalOpen}
        title="Editar datos personales"
        onClose={() => setIsPersonalModalOpen(false)}
      >
        <div className="profile-modal-form">
          <div className="profile-modal-field">
            <label className="profile-modal-label">Nombre</label>
            <input
              className="profile-modal-input"
              name="firstName"
              value={personalForm.firstName}
              onChange={handlePersonalChange}
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Segundo nombre</label>
            <input
              className="profile-modal-input"
              name="middleName"
              value={personalForm.middleName}
              onChange={handlePersonalChange}
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Primer apellido</label>
            <input
              className="profile-modal-input"
              name="firstSurname"
              value={personalForm.firstSurname}
              onChange={handlePersonalChange}
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Segundo apellido</label>
            <input
              className="profile-modal-input"
              name="secondSurname"
              value={personalForm.secondSurname}
              onChange={handlePersonalChange}
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Fecha de nacimiento</label>
            <input
              className="profile-modal-input"
              type="date"
              name="birthDate"
              value={personalForm.birthDate}
              onChange={handlePersonalChange}
            />
          </div>

          <div className="profile-modal-actions">
            <button
              className="profile-button profile-button--ghost"
              onClick={() => setIsPersonalModalOpen(false)}
              disabled={isSavingPersonal}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="profile-button profile-button--primary"
              onClick={handleSavePersonal}
              disabled={isSavingPersonal}
              type="button"
            >
              {isSavingPersonal ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </EditModal>

      {/* ===== CONTACTO ===== */}
      <section
        className={`profile-section ${openSection === "contact" ? "profile-section--active" : ""
          }`}
      >
        <button
          className={`profile-section__header ${openSection === "contact" ? "profile-section__header--active" : ""
            }`}
          onClick={() => toggleSection("contact")}
        >
          <span>
            <i className="bi bi-telephone"></i> Contacto
          </span>
          <i className={`bi bi-chevron-${openSection === "contact" ? "up" : "down"}`} />
        </button>

        {openSection === "contact" && (
          <div className="profile-section__body">
            <div className="profile-field">
              <span className="profile-label">Email</span>
              <span className="profile-value">{user.email}</span>
            </div>

            <div className="profile-section__body-header" style={{ marginTop: 12 }}>
              <span className="profile-section__body-title">Teléfonos</span>
              <button
                className="profile-button profile-button--secondary"
                onClick={openAddPhone}
                type="button"
              >
                + Agregar
              </button>
            </div>

            {!user.phones || user.phones.length === 0 ? (
              <p className="profile-empty">Aún no registraste teléfonos.</p>
            ) : (
              <div className="profile-cards">
                {user.phones.map((p) => (
                  <div key={p._id} className="profile-card">
                    <div className="profile-card__top">
                      <span className="profile-chip">{p.type || "Celular"}</span>

                      <div className="profile-card__actions">
                        <button
                          className="profile-icon-btn"
                          onClick={() => openEditPhone(p)}
                          title="Editar"
                          type="button"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>

                        <button
                          className="profile-icon-btn profile-icon-btn--danger"
                          onClick={() => handleDeletePhone(p._id)}
                          title="Eliminar"
                          type="button"
                          disabled={isDeletingPhone}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>

                    <div className="profile-card__body">
                      <div className="profile-card__line">
                        <strong>Número:</strong> {p.number || "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <EditModal
        isOpen={isPhoneModalOpen}
        title={phoneMode === "add" ? "Agregar teléfono" : "Editar teléfono"}
        onClose={() => setIsPhoneModalOpen(false)}
      >
        <div className="profile-modal-form">
          <div className="profile-modal-field">
            <label className="profile-modal-label">Tipo</label>
            <select
              className="profile-modal-input"
              name="type"
              value={phoneForm.type}
              onChange={handlePhoneChange}
            >
              <option value="Celular">Celular</option>
              <option value="Fijo">Fijo</option>
              <option value="Trabajo">Trabajo</option>
            </select>
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Número</label>
            <input
              className="profile-modal-input"
              name="number"
              value={phoneForm.number}
              onChange={handlePhoneChange}
              placeholder="Ej: 099123456"
            />
          </div>

          <div className="profile-modal-actions">
            <button
              className="profile-button profile-button--ghost"
              onClick={() => setIsPhoneModalOpen(false)}
              disabled={isSavingPhone}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="profile-button profile-button--primary"
              onClick={handleSavePhone}
              disabled={isSavingPhone}
              type="button"
            >
              {isSavingPhone ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </EditModal>

      {/* ===== TARJETAS ===== */}
      <section
        className={`profile-section ${openSection === "cards" ? "profile-section--active" : ""
          }`}
      >
        <button
          className={`profile-section__header ${openSection === "cards" ? "profile-section__header--active" : ""
            }`}
          onClick={() => toggleSection("cards")}
        >
          <span>
            <i className="bi bi-credit-card"></i> Métodos de pago
          </span>
          <i className={`bi bi-chevron-${openSection === "cards" ? "up" : "down"}`} />
        </button>

        {openSection === "cards" && (
          <div className="profile-section__body">
            <div className="profile-section__body-header">
              <span className="profile-section__body-title">Mis tarjetas</span>

              <button
                className="profile-button profile-button--secondary"
                onClick={openAddCard}
                type="button"
              >
                + Agregar
              </button>
            </div>

            {!user.cards || user.cards.length === 0 ? (
              <p className="profile-empty">Aún no registraste tarjetas.</p>
            ) : (
              <div className="profile-cards">
                {user.cards.map((c) => {
                  const expired = isExpired(c.expirationMonth, c.expirationYear);

                  return (
                    <div
                      key={c._id}
                      className={`profile-card ${expired ? "profile-card--expired" : ""}`}
                      aria-disabled={expired ? "true" : "false"}
                    >
                      {expired && (
                        <div className="profile-card__ribbon">
                          <span>VENCIDA</span>
                        </div>
                      )}

                      <div className="profile-card__top">
                        {(() => {
                          const brand = getCardBrandUI(c.type);
                          return (
                            <span className="profile-chip profile-chip--brand">
                              {brand.src && (
                                <img
                                  src={brand.src}
                                  alt={brand.label}
                                  className="profile-chip__logo"
                                />
                              )}
                              <span className="profile-chip__text">{brand.label}</span>
                            </span>
                          );
                        })()}

                        <div className="profile-card__actions">
                          <button
                            className="profile-icon-btn"
                            onClick={() => openEditCard(c)}
                            title={expired ? "Tarjeta vencida" : "Editar"}
                            type="button"
                            disabled={expired}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>

                          <button
                            className="profile-icon-btn profile-icon-btn--danger"
                            onClick={() => requestDeleteCard(c._id)}
                            title="Eliminar"
                            type="button"
                            disabled={isDeletingCard}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>

                      <div className="profile-card__body">
                        <div className="profile-card__line">
                          <strong>{maskCardNumber(c.cardNumber)}</strong>
                        </div>

                        <div className="profile-card__line">
                          Vence: {String(c.expirationMonth).padStart(2, "0")}/
                          {String(c.expirationYear).slice(-2)}
                        </div>

                        <div className="profile-card__line">
                          Titular: {c.cardHolder || "-"}
                        </div>

                        {!!c.bank && (
                          <div className="profile-card__line">Banco: {c.bank}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <EditModal
        isOpen={isCardModalOpen}
        title={cardMode === "add" ? "Agregar tarjeta" : "Editar tarjeta"}
        onClose={() => setIsCardModalOpen(false)}
      >
        <CardPreview number={cardForm.number} holderName={cardForm.holderName} expiry={cardForm.expiry} />

        <div className="profile-modal-form">
          <div className="profile-modal-field">
            <label className="profile-modal-label">Titular</label>
            <input
              className="profile-modal-input"
              name="holderName"
              value={cardForm.holderName}
              onChange={handleCardChange}
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Número</label>
            <input
              className="profile-modal-input"
              name="number"
              value={cardForm.number}
              onChange={handleCardChange}
              placeholder="1234 5678 9012 3456"
              inputMode="numeric"
              maxLength={19}
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Vencimiento</label>
            <input
              className="profile-modal-input"
              name="expiry"
              value={cardForm.expiry}
              onChange={handleCardChange}
              placeholder="MM/YY"
              inputMode="numeric"
              maxLength={5}
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Código de seguridad</label>
            <input
              className="profile-modal-input"
              name="cvv"
              value={cardForm.cvv}
              onChange={handleCardChange}
              placeholder="CVV"
              inputMode="numeric"
              maxLength={4}
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Banco (opcional)</label>
            <input
              className="profile-modal-input"
              name="bank"
              value={cardForm.bank}
              onChange={handleCardChange}
              placeholder="Santander / Itaú..."
            />
          </div>

          <div className="profile-modal-actions">
            <button
              className="profile-button profile-button--ghost"
              onClick={() => setIsCardModalOpen(false)}
              disabled={isSavingCard}
              type="button"
            >
              Cancelar
            </button>

            <button
              className="profile-button profile-button--primary"
              onClick={handleSaveCard}
              disabled={isSavingCard}
              type="button"
            >
              {isSavingCard ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </EditModal>

      {/* ===== DIRECCIONES ===== */}
      <section
        className={`profile-section ${openSection === "addresses" ? "profile-section--active" : ""
          }`}
      >
        <button
          className={`profile-section__header ${openSection === "addresses" ? "profile-section__header--active" : ""
            }`}
          onClick={() => toggleSection("addresses")}
        >
          <span>
            <i className="bi bi-geo-alt"></i> Direcciones
          </span>
          <i className={`bi bi-chevron-${openSection === "addresses" ? "up" : "down"}`} />
        </button>

        {openSection === "addresses" && (
          <div className="profile-section__body">
            <div className="profile-section__body-header">
              <span className="profile-section__body-title">Mis direcciones</span>

              <button
                className="profile-button profile-button--secondary"
                onClick={openAddAddress}
                type="button"
              >
                + Agregar
              </button>
            </div>

            {!user.addresses || user.addresses.length === 0 ? (
              <p className="profile-empty">Aún no registraste direcciones.</p>
            ) : (
              <div className="profile-cards">
                {user.addresses.map((a) => (
                  <div key={a._id} className="profile-card">
                    <div className="profile-card__top">
                      <span className="profile-chip">{a.reference || "Casa"}</span>

                      <div className="profile-card__actions">
                        <button
                          className="profile-icon-btn"
                          onClick={() => openEditAddress(a)}
                          title="Editar"
                          type="button"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>

                        <button
                          className="profile-icon-btn profile-icon-btn--danger"
                          onClick={() => handleDeleteAddress(a._id)}
                          title="Eliminar"
                          type="button"
                          disabled={isDeletingAddress}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>

                    <div className="profile-card__body">
                      <div className="profile-card__line">
                        <strong>{a.street || "-"}</strong> {a.number ? `#${a.number}` : ""}
                      </div>
                      <div className="profile-card__line">
                        {a.city || "-"}, {a.department || "-"}
                      </div>
                      <div className="profile-card__line">CP: {a.postalCode || "-"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <EditModal
        isOpen={isAddressModalOpen}
        title={addressMode === "add" ? "Agregar dirección" : "Editar dirección"}
        onClose={() => setIsAddressModalOpen(false)}
      >
        <div className="profile-modal-form">
          <div className="profile-modal-field">
            <label className="profile-modal-label">Referencia</label>
            <select
              className="profile-modal-input"
              name="reference"
              value={addressForm.reference}
              onChange={handleAddressChange}
            >
              <option value="Casa">Casa</option>
              <option value="Trabajo">Trabajo</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Calle</label>
            <input
              className="profile-modal-input"
              name="street"
              value={addressForm.street}
              onChange={handleAddressChange}
              placeholder="Ej: Av. Italia"
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Número</label>
            <input
              className="profile-modal-input"
              name="number"
              value={addressForm.number}
              onChange={handleAddressChange}
              placeholder="Ej: 1234"
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Ciudad</label>
            <input
              className="profile-modal-input"
              name="city"
              value={addressForm.city}
              onChange={handleAddressChange}
              placeholder="Ej: Montevideo"
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Departamento</label>
            <input
              className="profile-modal-input"
              name="department"
              value={addressForm.department}
              onChange={handleAddressChange}
              placeholder="Ej: Montevideo"
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Código Postal</label>
            <input
              className="profile-modal-input"
              name="postalCode"
              value={addressForm.postalCode}
              onChange={handleAddressChange}
              placeholder="Ej: 11000"
            />
          </div>

          <div className="profile-modal-actions">
            <button
              className="profile-button profile-button--ghost"
              onClick={() => setIsAddressModalOpen(false)}
              disabled={isSavingAddress}
              type="button"
            >
              Cancelar
            </button>

            <button
              className="profile-button profile-button--primary"
              onClick={handleSaveAddress}
              disabled={isSavingAddress}
              type="button"
            >
              {isSavingAddress ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </EditModal>

      {/* ===== SEGURIDAD ===== */}
      <section
        className={`profile-section ${openSection === "security" ? "profile-section--active" : ""
          }`}
      >
        <button
          className={`profile-section__header ${openSection === "security" ? "profile-section__header--active" : ""
            }`}
          onClick={() => toggleSection("security")}
        >
          <span>
            <i className="bi bi-shield-lock"></i> Seguridad
          </span>
          <i className={`bi bi-chevron-${openSection === "security" ? "up" : "down"}`} />
        </button>

        {openSection === "security" && (
          <div className="profile-section__body">
            <div className="profile-security-cards">
              {/* Cambiar contraseña */}
              <div className="profile-card">
                <div className="profile-card__top">
                  <span className="profile-chip">
                    <i className="bi bi-lock"></i> Contraseña
                  </span>
                </div>

                <div className="profile-card__body">
                  <p className="profile-card__text">
                    Actualizá tu contraseña para mantener tu cuenta segura.
                  </p>

                  <button
                    className="profile-button profile-button--primary"
                    type="button"
                    onClick={() => setIsChangePassOpen(true)}
                  >
                    Cambiar contraseña
                  </button>
                </div>
              </div>

              <div className="profile-security-separator">
                <span>Opciones alternativas</span>
              </div>

              {/* ===== MODAL: CAMBIAR CONTRASEÑA (mismo look que Login/Register) ===== */}
              <EditModal
                isOpen={isChangePassOpen}
                title="Cambiar contraseña"
                onClose={closeChangePassModal}
              >
                <form
                  className={`login-modal__form ${showPassInfo ? "login-modal__form--popover" : ""}`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitChangePassword();
                  }}
                >
                  {/* Contraseña actual */}
                  <div className="floating-input lpw-field">
                    <input
                      type={showCurPass ? "text" : "password"}
                      required
                      className={
                        "floating-input__field" +
                        (hasFieldError ? " floating-input__field--error" : "")
                      }
                      placeholder=" "
                      name="currentPassword"
                      value={changePassForm.currentPassword}
                      onChange={handleChangePassField}
                      disabled={isChangingPass}
                      autoComplete="current-password"
                    />
                    <label className="floating-input__label">
                      Contraseña actual
                    </label>

                    {changePassForm.currentPassword.length > 0 && (
                      <button
                        type="button"
                        className="lpw-icon-btn lpw-icon-btn--solo"
                        onClick={() => setShowCurPass((v) => !v)}
                        disabled={isChangingPass}
                      >
                        <i className={`bi ${showCurPass ? "bi-eye-slash" : "bi-eye"}`} />
                      </button>
                    )}


                  </div>

                  <div className="floating-input lpw-field">
                    <input
                      className="floating-input__field"
                      type={showNewPass ? "text" : "password"}
                      name="newPassword"
                      value={changePassForm.newPassword}
                      onChange={handleChangePassField}
                      placeholder=" "
                      disabled={isChangingPass}
                      autoComplete="new-password"
                    />
                    <label className="floating-input__label">Nueva contraseña</label>

                    {/* ===== ICONOS (info + ojo) ===== */}
                    <div className="lpw-icons">
                      {/* info siempre visible */}
                      <button
                        type="button"
                        className="lpw-icon-btn"
                        onClick={() => setShowPassInfo((v) => !v)}
                        title="Requisitos"
                        disabled={isChangingPass}
                      >
                        <i className="bi bi-info-circle" />
                      </button>

                      {/* ojo solo si hay texto */}
                      {changePassForm.newPassword.length > 0 && (
                        <button
                          type="button"
                          className="lpw-icon-btn"
                          onClick={() => setShowNewPass((v) => !v)}
                          title={showNewPass ? "Ocultar" : "Mostrar"}
                          disabled={isChangingPass}
                        >
                          <i className={`bi ${showNewPass ? "bi-eye-slash" : "bi-eye"}`} />
                        </button>
                      )}
                    </div>

                    {/* ===== POPOVER ===== */}
                    {showPassInfo && (
                      <>
                        <button
                          type="button"
                          className="lpw-overlay"
                          onClick={() => setShowPassInfo(false)}
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

                    {/* ===== FORTALEZA ===== */}
                    {changePassForm.newPassword.length > 0 && (
                      <div className="lpw-strength">
                        <div className="lpw-bar">
                          <div
                            className="lpw-fill"
                            style={{
                              width: `${strengthPct}%`,
                              background:
                                strengthScore <= 2
                                  ? "#dc3545"
                                  : strengthScore === 3
                                    ? "#f59e0b"
                                    : "#16a34a",
                            }}
                          />
                        </div>
                        <p className="lpw-meta">Fortaleza: {strengthLabel}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirmar nueva contraseña */}
                  <div className="floating-input lpw-field">
                    <input
                      type={showConfPass ? "text" : "password"}
                      required
                      className={
                        "floating-input__field" +
                        (hasFieldError ? " floating-input__field--error" : "")
                      }
                      placeholder=" "
                      name="confirmNewPassword"
                      value={changePassForm.confirmNewPassword}
                      onChange={(e) => {
                        handleChangePassField(e);
                        if (!e.target.value) setShowConfPass(false);
                      }}
                      disabled={isChangingPass}
                      autoComplete="new-password"
                    />
                    <label className="floating-input__label">
                      Confirmar nueva contraseña
                    </label>

                    {changePassForm.confirmNewPassword.length > 0 && (
                      <button
                        type="button"
                        className="lpw-icon-btn lpw-icon-btn--solo"
                        onClick={() => setShowConfPass((v) => !v)}
                        disabled={isChangingPass}
                      >
                        <i className={`bi ${showConfPass ? "bi-eye-slash" : "bi-eye"}`} />
                      </button>
                    )}


                  </div>

                  <button
                    type="submit"
                    className="login-modal__btn"
                    disabled={isChangingPass}
                  >
                    {isChangingPass ? "Guardando..." : "Guardar"}
                  </button>
                </form>
              </EditModal>

              {/* Recuperación */}
              <div className="profile-card profile-card--secondary">
                <div className="profile-card__top">
                  <span className="profile-chip">
                    <i className="bi bi-arrow-clockwise"></i> Recuperación
                  </span>
                </div>

                <div className="profile-card__body">
                  <p className="profile-card__text">
                    Enviá un email para recuperar el acceso si olvidás tu contraseña.
                  </p>

                  <button
                    className="profile-button profile-button--secondary"
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                  >
                    Enviar email de recuperación
                  </button>
                </div>
              </div>

              {/* ===== MODAL: RECUPERAR CONTRASEÑA ===== */}
              <EditModal
                isOpen={isForgotOpen}
                title="Recuperación de contraseña"
                onClose={closeForgotModal}
              >
                <div className="profile-modal-form">
                  <p className="profile-card__text" style={{ marginTop: 0 }}>
                    Te vamos a enviar un email con instrucciones para recuperar el acceso.
                  </p>

                  <div className="profile-modal-field">
                    <label className="profile-modal-label">Email</label>
                    <input
                      className="profile-modal-input"
                      type="email"
                      value={recoverEmail}
                      onChange={handleRecoverEmailChange}
                      placeholder="tuemail@correo.com"
                    />
                  </div>

                  <div className="profile-modal-actions">
                    <button
                      className="profile-button profile-button--ghost"
                      onClick={closeForgotModal}
                      disabled={isSendingRecover}
                      type="button"
                    >
                      Cancelar
                    </button>

                    <button
                      className="profile-button profile-button--secondary"
                      onClick={handleSubmitForgotPassword}
                      disabled={isSendingRecover}
                      type="button"
                    >
                      {isSendingRecover ? "Enviando..." : "Enviar email"}
                    </button>
                  </div>
                </div>
              </EditModal>
            </div>
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        loading={confirmState.loading}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
      />
    </div>
  );
};

export default Profile;

