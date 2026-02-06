// src/utils/passwordRules.js

// Reglas base
export const PASSWORD_RULES = {
  minLen: 10,
  // al menos una mayúscula, una minúscula, un número y un especial
  upper: /[A-Z]/,
  lower: /[a-z]/,
  number: /\d/,
  // especiales comunes (podés ampliar si querés)
  special: /[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/,
};

// Devuelve un checklist para pintar requisitos en UI
export function passwordChecklist(password = "") {
  return {
    len: password.length >= PASSWORD_RULES.minLen,
    upper: PASSWORD_RULES.upper.test(password),
    lower: PASSWORD_RULES.lower.test(password),
    num: PASSWORD_RULES.number.test(password),
    special: PASSWORD_RULES.special.test(password),
  };
}

// Valida si cumple TODO
export function isValidPassword(password = "") {
  const c = passwordChecklist(password);
  return c.len && c.upper && c.lower && c.num && c.special;
}

// Score simple (0..5) y percent + label
export function passwordScore(password = "") {
  const c = passwordChecklist(password);

  // 5 checks
  const score =
    (c.len ? 1 : 0) +
    (c.upper ? 1 : 0) +
    (c.lower ? 1 : 0) +
    (c.num ? 1 : 0) +
    (c.special ? 1 : 0);

  const percent = Math.round((score / 5) * 100);

  let label = "Muy débil";
  if (score === 2) label = "Débil";
  if (score === 3) label = "Media";
  if (score === 4) label = "Fuerte";
  if (score === 5) label = "Muy fuerte";

  return { score, percent, label, checklist: c };
}
