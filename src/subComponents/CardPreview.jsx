import React from "react";
import visa from "../assets/visa.svg";
import mc from "../assets/mastercard.svg";
import amex from "../assets/amex.svg";

const logos = {
  visa,
  mastercard: mc,
  amex,
};

// Detecta financiera por BIN/IIN
const detectCardBrand = (number = "") => {
  const digits = String(number).replace(/\D/g, "");

  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "generic";
};

// Formatea visualmente el número (para el preview)
const formatCardNumber = (value = "") => {
  const digits = String(value).replace(/\D/g, "").slice(0, 19);
  if (!digits) return "**** **** **** ****";
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

const CardPreview = ({ number, holderName, expiry }) => {
  const brand = detectCardBrand(number);
  const logo = logos[brand];

  return (
    <div className={`card-preview card-preview--${brand}`}>
      <div className="card-preview__top">
        {logo ? <img src={logo} alt={brand} /> : <span />}
      </div>

      <div className="card-preview__number">{formatCardNumber(number)}</div>

      <div className="card-preview__footer">
        <div>
          <span>Titular</span>
          <strong>{holderName?.trim() || "NOMBRE APELLIDO"}</strong>
        </div>

        <div>
          <span>Vence</span>
          <strong>{expiry || "MM/YY"}</strong>
        </div>
      </div>
    </div>
  );
};

export default CardPreview;
