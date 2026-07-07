/** Mirrors backend/helpers/phoneUtils.jsw — 05XXXXXXXX (10 digits, no special chars). */
export function normalizeIsraeliPhone(phone) {
  if (phone === undefined || phone === null) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length >= 10) {
    digits = "0" + digits.slice(3, 12);
  } else if (digits.length === 9 && digits.startsWith("5")) {
    digits = "0" + digits;
  } else if (digits.length > 10) {
    digits = digits.slice(0, 10);
  }
  return digits.length === 10 && digits.startsWith("05") ? digits : digits.slice(0, 10);
}

export function isValidIsraeliPhone(phone) {
  return /^05\d{8}$/.test(normalizeIsraeliPhone(phone));
}

/** Live input formatting: strips symbols and converts +972… to 05… while typing. */
export function formatIsraeliPhoneInput(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("972")) {
    digits = "0" + digits.slice(3);
  } else if (digits.length === 9 && digits.startsWith("5")) {
    digits = "0" + digits;
  }
  return digits.slice(0, 10);
}
