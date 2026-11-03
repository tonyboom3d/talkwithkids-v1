/** מראה ל-`israelDateKey`/`isFutureDueDate` ב-`src/backend/depositConfig.jsw` — לשימוש בצד הלקוח (ולידציה + min על שדות תאריך) */
const IL_TZ = "Asia/Jerusalem";

/** מזהה יום בטיימזון ישראל (YYYY-MM-DD) */
export function israelDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return String(new Intl.DateTimeFormat("en-CA", { timeZone: IL_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d));
}

/** היום הראשון שניתן לבחור כתאריך יעד (מחר, לפי שעון ישראל) — לשימוש כ-`min` בשדות תאריך */
export function resolveMinFutureDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return israelDateKey(d);
}

/** האם תאריך יעד עתידי (אחרי היום הנוכחי) לפי שעון ישראל */
export function isFutureDueDate(value) {
  if (!value) return false;
  const key = israelDateKey(value);
  if (!key) return false;
  return key > israelDateKey(new Date());
}
