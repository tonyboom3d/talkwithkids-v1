/**
 * סגנון inline לתגית יוצר/ת — לפי צבע מ־CMS (AuthorizedEmployees).
 * תומך ב־#RRGGBB, #RGB, rgb()/rgba(), ושמות צבע CSS.
 */
function parseHexRgb(hex6) {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(String(hex6 || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgbaBackground(hex6, alpha = 0.38) {
  const rgb = parseHexRgb(hex6);
  if (!rgb) return null;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function expandHex3(hex) {
  const m = /^#([0-9A-Fa-f]{3})$/.exec(hex.trim());
  if (!m) return null;
  const s = m[1];
  return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
}

function relativeLuminance({ r, g, b }) {
  const channel = (v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function darkenRgb({ r, g, b }, factor) {
  return rgbToHex(r * factor, g * factor, b * factor);
}

/** צבע טקסט קריא על רקע תגית בהיר */
function readableTextColorFromRgb(rgb) {
  if (!rgb) return "#334155";

  let factor = 0.38;
  let textHex = darkenRgb(rgb, factor);
  let lum = relativeLuminance(parseHexRgb(textHex));

  while (lum > 0.45 && factor > 0.15) {
    factor -= 0.08;
    textHex = darkenRgb(rgb, factor);
    lum = relativeLuminance(parseHexRgb(textHex));
  }

  return lum > 0.45 ? "#1e293b" : textHex;
}

function parseRgbString(raw) {
  const match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(raw);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
}

export function creatorTagStyleFromColor(color) {
  const raw = String(color ?? "").trim();
  if (!raw) return undefined;

  const hex6Direct = /^#([0-9A-Fa-f]{6})$/i.exec(raw);
  const hex3 = expandHex3(raw);
  const canonicalHex = hex6Direct ? raw : hex3;

  if (canonicalHex) {
    const rgb = parseHexRgb(canonicalHex);
    const backgroundColor = hexToRgbaBackground(canonicalHex, 0.38) || "rgb(248 250 252)";
    const textColor = readableTextColorFromRgb(rgb);
    const borderColor = darkenRgb(rgb, 0.55);

    return {
      borderColor,
      borderWidth: 1,
      borderStyle: "solid",
      backgroundColor,
      color: textColor,
    };
  }

  const rgbFromString = parseRgbString(raw);
  if (rgbFromString) {
    const backgroundColor = `rgba(${rgbFromString.r},${rgbFromString.g},${rgbFromString.b},0.38)`;
    return {
      borderColor: darkenRgb(rgbFromString, 0.55),
      borderWidth: 1,
      borderStyle: "solid",
      backgroundColor,
      color: readableTextColorFromRgb(rgbFromString),
    };
  }

  return {
    borderColor: raw,
    borderWidth: 1,
    borderStyle: "solid",
    backgroundColor: "rgb(248 250 252)",
    color: "#334155",
  };
}
