/**
 * מודול 1: ניהול מקדמות — פיצ'רים אלה מוצגים בשלב הפיתוח רק לעובד/ת "טוני בדיקה".
 * האכיפה האמיתית היא בצד השרת (backend/depositConfig.jsw); הדגל כאן קובע רק תצוגה בממשק.
 */
const DEPOSIT_MODULE_EMPLOYEE_NAMES = new Set(["טוני בדיקה"]);

export function isDepositModuleEnabled(user) {
  const name = String(user?.displayName || "").trim();
  return DEPOSIT_MODULE_EMPLOYEE_NAMES.has(name);
}
