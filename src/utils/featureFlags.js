/**
 * מודול 1: ניהול מקדמות — פיצ'רים אלה מוצגים בשלב הפיתוח רק לעובד/ת "טוני בדיקה".
 * האכיפה האמיתית היא בצד השרת (backend/depositConfig.jsw); הדגל כאן קובע רק תצוגה בממשק.
 */
const DEPOSIT_MODULE_EMPLOYEE_NAMES = new Set(["טוני בדיקה"]);
const DEPOSIT_MODULE_EMPLOYEE_IDS = new Set(["57b05478-fcbc-4008-843b-abb910c9dd55"]);

export function isDepositModuleEnabled(user) {
  const name = String(user?.displayName || "").trim();
  const id = String(user?.id || user?._id || user?.memberId || "").trim();
  return DEPOSIT_MODULE_EMPLOYEE_NAMES.has(name) || DEPOSIT_MODULE_EMPLOYEE_IDS.has(id);
}
