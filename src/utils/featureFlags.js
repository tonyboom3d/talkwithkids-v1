/**
 * מודול 1: ניהול מקדמות — פיצ'רים אלה מוצגים בשלב הפיתוח רק לעובד/ת "טוני בדיקה".
 * האכיפה האמיתית היא בצד השרת (backend/depositConfig.jsw); הדגל כאן קובע רק תצוגה בממשק.
 */
const DEPOSIT_MODULE_EMPLOYEE_NAMES = new Set(["טוני בדיקה"]);
const DEPOSIT_MODULE_EMPLOYEE_IDS = new Set([
  "9996fe85-9725-4266-a4d7-106efe90a64c",
  "57b05478-fcbc-4008-843b-abb910c9dd55",
  "819ff3aa-fca4-4778-ac43-2b66a0987ab5",
  "2e4d12ce-18e0-4706-8577-b09f9b54ddae",
]);

export function isDepositModuleEnabled(user) {
  const name = String(user?.displayName || "").trim();
  if (DEPOSIT_MODULE_EMPLOYEE_NAMES.has(name)) return true;
  const ids = [user?.id, user?._id, user?.memberId]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return ids.some((id) => DEPOSIT_MODULE_EMPLOYEE_IDS.has(id));
}
