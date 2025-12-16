import React from "react";
import EditModal from "./EditModal";

const ConfirmModal = ({
  isOpen,
  title = "Confirmar",
  message = "¿Estás seguro?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}) => {
  const safeClose = () => {
    if (loading) return; // 🔒 no permitir cerrar mientras procesa
    onClose?.();
  };

  return (
    <EditModal isOpen={isOpen} title={title} onClose={safeClose}>
      <div className="profile-modal-form">
        <p style={{ margin: "0 0 14px 0", lineHeight: 1.4 }}>{message}</p>

        <div className="profile-modal-actions">
          <button
            className="profile-button profile-button--ghost"
            onClick={safeClose}
            disabled={loading}
            type="button"
          >
            {cancelText}
          </button>

          <button
            className={`profile-button ${
              danger ? "profile-button--danger" : "profile-button--primary"
            }`}
            onClick={onConfirm}
            disabled={loading}
            type="button"
          >
            {loading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </EditModal>
  );
};

export default ConfirmModal;
