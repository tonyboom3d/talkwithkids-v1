/**
 * סגנון inline לתגית יוצר/ת — לפי צבע מ־CMS (AuthorizedEmployees.color).
 * תומך ב־#RRGGBB; אחרת משתמש בערך כ־border ורקע ברירת מחדל.
 */
export function creatorTagStyleFromColor(color) {
  const c = String(color ?? "").trim();
  if (!c) return undefined;

  const hex6 = /^#([0-9A-Fa-f]{6})$/.exec(c);
  let backgroundColor = "rgb(248 250 252)"; // slate-50
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    backgroundColor = `rgba(${r},${g},${b},0.2)`;
  }

  return {
    borderColor: c,
    backgroundColor,
  };
}
