/**
 * נרמול מספר טלפון ישראלי לפורמט אחיד: 05XXXXXXXX (10 ספרות, מתחיל ב-05, ללא סימנים).
 * משמש בהזמנות, רישום משתמש ושליחה ל-webhook.
 * @param {string} phone - ערך גולמי (עם/בלי מקפים, רווחים, +972 וכו')
 * @returns {string} פורמט 05XXXXXXXX או מחרוזת ריקה אם לא תקין
 */
export function normalizeIsraeliPhone(phone) {
    if (phone === undefined || phone === null) return "";
    let d = String(phone).replace(/\D/g, "");
    if (d.startsWith("972") && d.length >= 10) {
        d = "0" + d.slice(3, 12);
    } else if (d.length === 9 && d.startsWith("5")) {
        d = "0" + d;
    } else if (d.length !== 10 || !d.startsWith("05")) {
        return "";
    }
    return d.length === 10 && d.startsWith("05") ? d : "";
}
