/**
 * סגנון inline לתגית יוצר/ת — לפי צבע מ־CMS (AuthorizedEmployees).
 * תומך ב־#RRGGBB, #RGB, rgb()/rgba(), ושמות צבע CSS.
 */
function hexToRgbaBackground(hex6, alpha = 0.2) {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex6);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function expandHex3(hex) {
  const m = /^#([0-9A-Fa-f]{3})$/.exec(hex.trim());
  if (!m) return null;
  const s = m[1];
  return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
}

export function creatorTagStyleFromColor(color) {
  const raw = String(color ?? "").trim();
  if (!raw) return undefined;

  const hex6Direct = /^#([0-9A-Fa-f]{6})$/i.exec(raw);
  const hex3 = expandHex3(raw);
  const canonicalHex = hex6Direct ? raw : hex3;

  let backgroundColor = "rgb(248 250 252)";

  if (canonicalHex) {
    const bg = hexToRgbaBackground(canonicalHex, 0.2);
    if (bg) backgroundColor = bg;
  } else if (/^rgba?\(/i.test(raw)) {
    return {
      borderColor: raw,
      borderWidth: 1,
      borderStyle: "solid",
      backgroundColor: "rgb(248 250 252)",
    };
  }

  return {
    borderColor: raw,
    borderWidth: 1,
    borderStyle: "solid",
    backgroundColor,
  };
}
