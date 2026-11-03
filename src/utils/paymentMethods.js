export const STANDING_ORDER_PAYMENT_METHOD = "הוראת קבע";
export const CARDCOM_PHONE_PAYMENT_METHOD = "קארדקום טלפונית";

export const PAYMENT_METHOD_OPTIONS = ["ביט", "פייבוקס", STANDING_ORDER_PAYMENT_METHOD, "העברה בנקאית", CARDCOM_PHONE_PAYMENT_METHOD, "מזומן"];

/** תואם ל-`shouldSkipInvoiceForPaymentMethod` ב-`src/backend/dashboardApi.jsw` */
export const SKIP_AUTO_INVOICE_PAYMENT_METHODS = new Set([
  CARDCOM_PHONE_PAYMENT_METHOD,
  STANDING_ORDER_PAYMENT_METHOD,
]);

export function shouldSkipInvoiceForPaymentMethod(paymentMethod) {
  return SKIP_AUTO_INVOICE_PAYMENT_METHODS.has(String(paymentMethod || "").trim());
}
