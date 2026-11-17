/** מראה ל-`israelDateKey`/`isFutureDueDate` ב-`src/backend/depositConfig.jsw` — לשימוש בצד הלקוח (ולידציה + min על שדות תאריך) */
const IL_TZ = "Asia/Jerusalem";

/** מזהה יום בטיימזון ישראל (YYYY-MM-DD) */
export function israelDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return String(new Intl.DateTimeFormat("en-CA", { timeZone: IL_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d));
}

/** היום, לפי שעון ישראל — היום המוקדם ביותר שאפשר לבחור כתאריך יעד */
export function resolveMinDueDate() {
  return israelDateKey(new Date());
}

/** האם תאריך היעד הוא היום לפי שעון ישראל */
export function isDueDateToday(value) {
  if (!value) return false;
  const key = israelDateKey(value);
  if (!key) return false;
  return key === israelDateKey(new Date());
}

/** היום או תאריך עתידי. עבר נדחה. */
export function isDueDateTodayOrFuture(value) {
  if (!value) return false;
  const key = israelDateKey(value);
  if (!key) return false;
  return key >= israelDateKey(new Date());
}
