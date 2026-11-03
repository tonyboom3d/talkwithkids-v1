import { computeDisplayTotalAfterCoupon } from "@/utils/orderTotals";

export const PUBLIC_ORDER_BASE_URL = "https://www.talkwithkids.co.il/dashboard-orders";
export const DASHBOARD_PAGE_BASE_URL = "https://www.talkwithkids.co.il/טוני";

export function buildDashboardPageUrl() {
  return DASHBOARD_PAGE_BASE_URL;
}

export const STATUS_CONFIG = {
  sent: { label: "נשלח", className: "bg-slate-100 text-slate-600" },
  opened: { label: "נפתח", className: "bg-orange-100 text-orange-700" },
  unpaid: { label: "לא שולם", className: "bg-red-100 text-red-700" },
  cancelled: { label: "בוטל", className: "bg-red-100 text-red-700" },
  error: { label: "שגיאה", className: "bg-red-100 text-red-700" },
  awaiting_deposit: { label: "בהמתנה למקדמה – לא שולם", className: "bg-yellow-100 text-yellow-800" },
  deposit_paid: { label: "שולמה חלקית", className: "bg-orange-100 text-orange-700" },
  paid_partial: { label: "שולמה חלקית", className: "bg-orange-100 text-orange-700" },
  paid_pending_details: { label: "שולמה - לא הושלמה", className: "bg-violet-100 text-violet-700" },
  paid_completed: { label: "שולמה - הושלמה", className: "bg-emerald-100 text-emerald-700" },
  paid: { label: "שולם", className: "bg-emerald-100 text-emerald-700" },
};

export const STATUS_UPDATE_OPTIONS = ["sent", "opened", "awaiting_deposit", "paid_partial", "paid_pending_details", "paid_completed", "paid", "cancelled"];

export const SALES_STATUS_FILTERS = [
  "sent",
  "opened",
  "awaiting_deposit",
  "deposit_paid",
  "paid_partial",
  "paid_pending_details",
  "paid_completed",
  "paid",
  "cancelled",
  "error",
  "unpaid",
];

/**
 * צבע רקע שורה בטבלת ההזמנות לפי מצב תשלום (מודול 1, סעיף 4).
 * "באיחור" (תאריך יעד עבר ויתרה > 0) גובר על הצבע הרגיל של הסטטוס.
 */
export function resolveRowTone(order) {
  const status = order?.displayStatus;
  if (status === "paid" || status === "paid_completed") return "default";

  const dueDate = order?.balanceDueDate;
  const remaining = Number(order?.remainingPaymentAmount ?? 0);
  if (dueDate && remaining > 0) {
    const due = new Date(dueDate);
    if (!isNaN(due.getTime()) && due.getTime() <= Date.now()) {
      return "red";
    }
  }

  if (status === "awaiting_deposit") return "yellow";
  if (status === "paid_partial" || status === "deposit_paid") return "orange";
  return "default";
}

export const ROW_TONE_CLASSNAMES = {
  yellow: "bg-yellow-50 hover:bg-yellow-100/70",
  orange: "bg-orange-50 hover:bg-orange-100/70",
  red: "bg-red-50 hover:bg-red-100/70",
  default: "",
};

export function safeParseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

export function getDisplayStatus(order) {
  if (order.status && STATUS_CONFIG[order.status]) {
    return order.status;
  }

  if (order.linkCancelled) return "cancelled";
  if (order.errors) return "error";
  if (order.paymentStatus === "paid") return "paid";

  const timeline = Array.isArray(order.timeline) ? order.timeline : safeParseJson(order.changeChain, []);
  if (order.status === "opened" || timeline.some((event) => (event.action || event.type) === "link_opened")) {
    return "opened";
  }

  const orderDate = order._createdDate || order.date || "";
  if (orderDate) {
    const daysSinceCreation = Math.floor((Date.now() - new Date(orderDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreation >= 3 && order.paymentStatus !== "paid") {
      return "unpaid";
    }
  }

  return "sent";
}

export function getCouponSummary(couponDetails) {
  if (!couponDetails) return "ללא קופון";
  if (couponDetails.source === "auto_paid") {
    if (Number(couponDetails.actualPaidAmount) > 0) {
      return `שולם בפועל: ₪${Number(couponDetails.actualPaidAmount).toLocaleString("he-IL")} | קופון 100% להשלמת פרטים`;
    }
    return "שולם מראש - קופון 100% להשלמת פרטים";
  }
  if (couponDetails.source === "partial_paid") {
    return `שולם מראש: ₪${Number(couponDetails.paidAmount || couponDetails.value || 0).toLocaleString("he-IL")}`;
  }
  if (couponDetails.source === "existing") {
    return couponDetails.code ? `קופון קיים: ${couponDetails.code}` : "קופון קיים מהחנות";
  }

  if (couponDetails.source === "create") {
    const isPercent = couponDetails.type === "percent";
    const valueText = isPercent
      ? `${Number(couponDetails.value || 0)}%`
      : `₪${Number(couponDetails.value || 0).toLocaleString("he-IL")}`;
    return couponDetails.code
      ? `קופון חדש: ${valueText} (${couponDetails.code})`
      : `קופון חדש: ${valueText}`;
  }

  return "קופון";
}

/** מזהה לקישור הציבורי — שדה CMS `dynamicLinkId`; גיבוי: 16 תווים ראשונים מ־_id */
export function resolveDynamicLinkId(order) {
  const d = String(order?.dynamicLinkId ?? "").trim();
  if (d) return d;
  const id = order?._id || order?.id;
  if (id && String(id).length >= 10) return String(id).substring(0, 16);
  return "";
}

/** קישור לעמוד dashboard-orders עם פרמטר `id` (לא path) */
export function buildPublicOrderUrl(dynamicLinkId) {
  const id = String(dynamicLinkId ?? "").trim();
  if (!id) return "";
  return `${PUBLIC_ORDER_BASE_URL}?id=${encodeURIComponent(id)}`;
}

export function isPaidDisplayStatus(status) {
  return status === "paid" || status === "paid_partial" || status === "paid_pending_details" || status === "paid_completed";
}

/** הזמנת מקדמה שניתן להשלים לה תשלום ידנית (בהמתנה למקדמה / שולמה חלקית לאחר מקדמה) */
export function isDepositPayableStatus(order) {
  return (order?.displayStatus === "awaiting_deposit" || order?.displayStatus === "deposit_paid")
    && Number(order?.depositAmount) > 0;
}

/** סטטוסים בהם ניתן להציע "השלמת תשלום" מתוך פעולות נוספות */
export const COMPLETABLE_PAYMENT_STATUSES = ["sent", "opened", "unpaid", "awaiting_deposit", "deposit_paid", "paid_partial"];

export function canCompletePayment(order) {
  return COMPLETABLE_PAYMENT_STATUSES.includes(order?.displayStatus);
}

/** סכום ברירת מחדל בדיאלוג "השלמת תשלום": יתרת המקדמה בשלב ההמתנה, אחרת כל היתרה */
export function resolveCompletePaymentDefault(order) {
  if (order?.displayStatus === "awaiting_deposit" && Number(order?.depositAmount) > 0) {
    return Math.max(0, Number(order.depositAmount) - Math.max(0, Number(order.depositPaidAmount ?? 0)));
  }
  return resolveRemainingBalance(order);
}

export function resolveRemainingBalance(order) {
  if (!order) return 0;
  if (isDepositPayableStatus(order)) {
    const total = Math.max(0, Number(order.subtotalAmount ?? order.totalPrice ?? 0));
    return Math.max(0, total - Math.max(0, Number(order.depositPaidAmount ?? 0)));
  }
  if (order.displayStatus === "paid_partial") {
    const subtotal = Math.max(0, Number(order.subtotalAmount ?? order.totalPrice ?? 0));
    const paid = Math.max(0, Number(order.partialPaidAmount ?? 0));
    return Math.max(0, subtotal - paid);
  }
  if (["sent", "opened", "unpaid"].includes(order.displayStatus)) {
    return Math.max(0, Number(order.totalAmount ?? order.subtotalAmount ?? 0));
  }
  return 0;
}

function resolvePartialPaidAmount(order, couponDetails, subtotal) {
  const directValue = Number(order?.partialPaidAmount);
  if (Number.isFinite(directValue) && directValue > 0) {
    return Math.min(Math.max(0, directValue), subtotal);
  }

  if (couponDetails?.source === "partial_paid") {
    const couponValue = Number(couponDetails.paidAmount ?? couponDetails.value);
    if (Number.isFinite(couponValue) && couponValue > 0) {
      return Math.min(Math.max(0, couponValue), subtotal);
    }
  }

  if (couponDetails?.source === "auto_paid") {
    const actualPaidAmount = Number(couponDetails.actualPaidAmount);
    if (Number.isFinite(actualPaidAmount) && actualPaidAmount > 0) {
      return Math.max(0, actualPaidAmount);
    }
  }

  return 0;
}

/** "יעל כהן" → "יעל כ." — לתצוגה מצומצמת בנייד בלבד; לא משפיע על החיפוש */
export function formatShortName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0);
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

/** שם פרטי בלבד לתצוגת "יצר/ה" כטקסט רגיל (ללא תג צבעוני) */
export function formatCreatorFirstName(creatorName) {
  const trimmed = String(creatorName || "").trim();
  if (!trimmed || trimmed === "—") return "—";
  return trimmed.split(/\s+/)[0];
}

/** תוויות לתצוגת הסטטוס ההתחלתי באירוע "הזמנה נוצרה" בתרשים הזרימה */
const INITIAL_STATUS_LABELS = {
  sent: "לא שולמה",
  opened: "לא שולמה",
  unpaid: "לא שולמה",
};

export function resolveInitialStatusLabel(status) {
  if (!status) return "";
  return INITIAL_STATUS_LABELS[status] || STATUS_CONFIG[status]?.label || status;
}

/** הזמנות ישנות ללא initialStatus שמור — ניחוש לפי טקסט האירוע */
export function inferLegacyInitialStatus(detail) {
  const text = String(detail || "");
  if (text.includes("בהמתנה למקדמה")) return "awaiting_deposit";
  if (text.includes("שולמה חלקית") || text.includes("שולם מראש")) return "paid_partial";
  if (text.includes("שולמה") || text.includes("שולם")) return "paid_pending_details";
  return "sent";
}

/** מצב "תוכנית" לעמודה בטבלה: na = לא אמורה להיות תוכנית, yes/no = מחוברת/לא מחוברת עדיין */
export function resolvePlanStatus(order) {
  if (!order?.hasPlan) return "na";
  const unlocked = (order.timeline || []).some((event) => (event.action || event.type) === "program_unlocked");
  return unlocked ? "yes" : "no";
}

/** מצב "משלוח" לעמודה בטבלה: na = אין מוצר למשלוח בהזמנה, yes/no = נשלח/טרם נשלח */
export function resolveShippingStatus(order) {
  if (!order?.hasShipping) return "na";
  const hasDeliveryNumber = !!order?.deliveryNumber && order.deliveryNumber !== "—";
  const routed = hasDeliveryNumber || (order.timeline || []).some((event) => (event.action || event.type) === "shipment_routed");
  return routed ? "yes" : "no";
}

export function resolveWhatsappDeliveryStatus(order) {
  const whatsappData = safeParseJson(order?.whatsappData, null);
  const direct = String(whatsappData?.status || "").trim().toLowerCase();
  if (direct === "success" || direct === "failed" || direct === "requested") return direct;

  const timeline = Array.isArray(order?.timeline) ? order.timeline : safeParseJson(order?.changeChain, []);
  if (timeline.some((event) => (event.action || event.type) === "whatsapp_sent_success")) return "success";
  if (timeline.some((event) => (event.action || event.type) === "whatsapp_sent_failed")) return "failed";
  if (timeline.some((event) => (event.action || event.type) === "whatsapp_pending")) return "requested";
  return "";
}

/**
 * @param {object} order
 * @param {{ commissionRate?: number }} [options] - עמלה: אחוז מה־AuthorizedEmployees; רווח = סכום הזמנה * (אחוז/100) להזמנות ששולמו
 */
export function normalizeOrder(order, options = {}) {
  const timeline = Array.isArray(order.timeline)
    ? order.timeline
    : safeParseJson(order.changeChain, []);
  const products = Array.isArray(order.products)
    ? order.products
    : safeParseJson(order.products, []);
  const couponDetails = safeParseJson(order.couponDetails, null);
  const whatsappData = safeParseJson(order.whatsappData, null);
  const customerName = order.customer
    ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim()
    : (order.customerName || "").trim();
  const customerPhone = order.customer?.phone || order.customerPhone || "";
  const orderDate = order._createdDate || order.date || "";
  const sentDate = timeline.find((event) => (event.action || event.type) === "sent")?.date || orderDate;
  const rawOrderNumber = order.orderNumber && String(order.orderNumber).trim()
    ? String(order.orderNumber).trim()
    : "";
  const deliveryNumber = order.deliveryNumber && String(order.deliveryNumber).trim()
    ? String(order.deliveryNumber).trim()
    : "—";
  const creatorName =
    order.createdByName ||
    timeline.find((event) => (event.action || event.type) === "created")?.by ||
    "—";

  const rawSubtotal = Number(order.totalPrice ?? order.total ?? 0);
  const totalAmount = computeDisplayTotalAfterCoupon(rawSubtotal, couponDetails);
  const partialPaidAmount = resolvePartialPaidAmount(order, couponDetails, rawSubtotal);
  const commissionRate = Math.max(0, Number(options.commissionRate) || 0);

  const normalized = {
    ...order,
    rowId: order._id || order.id,
    timeline,
    products,
    couponDetails,
    customerName,
    customerPhone,
    orderDate,
    sentDate,
    orderNumber: rawOrderNumber,
    deliveryNumber,
    creatorName,
    creatorTagColor: order.creatorTagColor || "",
    checkoutLink: order.checkoutLink || order.paymentLink || "",
    publicOrderUrl: order.orderUrl || buildPublicOrderUrl(resolveDynamicLinkId(order)),
    subtotalAmount: rawSubtotal,
    totalAmount,
    partialPaidAmount,
    remainingPaymentAmount: Math.max(0, totalAmount),
    whatsappData,
  };

  normalized.displayStatus = getDisplayStatus(normalized);
  if (couponDetails?.source === "partial_paid" && normalized.displayStatus !== "paid_partial") {
    normalized.totalAmount = rawSubtotal;
    normalized.remainingPaymentAmount = 0;
  }
  normalized.orderNumber = rawOrderNumber || (normalized.displayStatus === "paid_pending_details" ? "ממתין להשלמה" : "ממתין לתשלום");
  normalized.statusCfg = STATUS_CONFIG[normalized.displayStatus] || STATUS_CONFIG.sent;
  normalized.couponSummary = getCouponSummary(couponDetails);
  normalized.whatsappDeliveryStatus = resolveWhatsappDeliveryStatus(normalized);
  normalized.balanceDueDate = order.balanceDueDate || null;
  normalized.depositAmount = Number.isFinite(Number(order.depositAmount)) ? Number(order.depositAmount) : 0;
  normalized.depositPaidAmount = Number.isFinite(Number(order.depositPaidAmount)) ? Number(order.depositPaidAmount) : 0;
  normalized.unlockProgramOnPurchase = order.unlockProgramOnPurchase !== false;
  normalized.depositLinkText = order.depositLinkText || "";
  try {
    normalized.depositOptions = order.depositOptions ? JSON.parse(order.depositOptions) : null;
  } catch {
    normalized.depositOptions = null;
  }
  normalized.hasPlan = !!order.hasPlan;
  normalized.hasShipping = !!order.hasShipping;
  normalized.planStatus = resolvePlanStatus(normalized);
  normalized.shippingStatus = resolveShippingStatus(normalized);
  normalized.rowTone = resolveRowTone(normalized);

  const paidForCommission = isPaidDisplayStatus(normalized.displayStatus);
  normalized.profitPercent = paidForCommission ? commissionRate : null;
  normalized.profitAmount = paidForCommission ? totalAmount * (commissionRate / 100) : null;

  return normalized;
}

/** מסנן הזמנות לפי טווח תאריכים (לפי תאריך יצירה), כולל יום הסיום במלואו */
export function filterOrdersByDateRange(orders = [], range) {
  const from = range?.from ? new Date(range.from) : null;
  const to = range?.to ? new Date(range.to) : null;
  if (!from && !to) return orders;

  const fromTime = from ? new Date(from).setHours(0, 0, 0, 0) : null;
  const toTime = to ? new Date(to).setHours(23, 59, 59, 999) : null;

  return (orders || []).filter((order) => {
    const orderDate = order.orderDate || order._createdDate || order.date;
    if (!orderDate) return false;
    const time = new Date(orderDate).getTime();
    if (isNaN(time)) return false;
    if (fromTime != null && time < fromTime) return false;
    if (toTime != null && time > toTime) return false;
    return true;
  });
}
