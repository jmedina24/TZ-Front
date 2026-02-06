import React, { useEffect } from "react";
import "../css/editModal.css";

const EditModal = ({ isOpen, title, onClose, children }) => {
  // ✅ Bloquea scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="editModal__overlay" onClick={onClose}>
      <div
        className="editModal__container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="editModal__header">
          <h4 className="editModal__title">{title}</h4>
          <button className="editModal__close" onClick={onClose} type="button">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="editModal__body">{children}</div>
      </div>
    </div>
  );
};

export default EditModal;
