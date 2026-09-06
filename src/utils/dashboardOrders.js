import { computeDisplayTotalAfterCoupon } from "@/utils/orderTotals";

export const PUBLIC_ORDER_BASE_URL = "https://www.talkwithkids.co.il/dashboard-orders";
export const DASHBOARD_PAGE_BASE_URL = "https://www.talkwithkids.co.il/טוני";
/** פרמטר query לעקיפת בדיקת משתמש מחובר — הערך חייב להתאים ל-DASHBOARD_BYPASS_CONFIG ב-Secrets Manager */
export const DASHBOARD_ACCESS_QUERY_PARAM = "access";

export function buildDashboardPageUrl(accessKey) {
  const key = String(accessKey ?? "").trim();
  if (!key) return DASHBOARD_PAGE_BASE_URL;
  const url = new URL(DASHBOARD_PAGE_BASE_URL);
  url.searchParams.set(DASHBOARD_ACCESS_QUERY_PARAM, key);
  return url.toString();
}

export function appendDashboardAccessParam(url, accessKey) {
  const key = String(accessKey ?? "").trim();
  const raw = String(url ?? "").trim();
  if (!key || !raw) return raw;
  try {
    const parsed = new URL(raw);
    parsed.searchParams.set(DASHBOARD_ACCESS_QUERY_PARAM, key);
    return parsed.toString();
  } catch (err) {
    const joiner = raw.includes("?") ? "&" : "?";
    return `${raw}${joiner}${DASHBOARD_ACCESS_QUERY_PARAM}=${encodeURIComponent(key)}`;
  }
}

export function parseDashboardAccessKey(search = "") {
  let query = String(search ?? "").trim();
  if (!query && typeof window !== "undefined") {
    query = window.location.search || "";
  }
  const normalized = query.startsWith("?") ? query.slice(1) : query;
  return new URLSearchParams(normalized).get(DASHBOARD_ACCESS_QUERY_PARAM)?.trim() || "";
}

export const STATUS_CONFIG = {
  sent: { label: "נשלח", className: "bg-slate-100 text-slate-600" },
  opened: { label: "נפתח", className: "bg-orange-100 text-orange-700" },
  unpaid: { label: "לא שולם", className: "bg-red-100 text-red-700" },
  cancelled: { label: "בוטל", className: "bg-red-100 text-red-700" },
  error: { label: "שגיאה", className: "bg-red-100 text-red-700" },
  paid_partial: { label: "שולמה חלקית", className: "bg-orange-100 text-orange-700" },
  paid_pending_details: { label: "שולמה - לא הושלמה", className: "bg-violet-100 text-violet-700" },
  paid_completed: { label: "שולמה - הושלמה", className: "bg-emerald-100 text-emerald-700" },
  paid: { label: "שולם", className: "bg-emerald-100 text-emerald-700" },
};

export const STATUS_UPDATE_OPTIONS = ["sent", "opened", "paid_partial", "paid_pending_details", "paid_completed", "paid", "cancelled"];

export const SALES_STATUS_FILTERS = [
  "sent",
  "opened",
  "paid_partial",
  "paid_pending_details",
  "paid_completed",
  "paid",
  "cancelled",
  "error",
  "unpaid",
];

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

export function resolveRemainingBalance(order) {
  if (!order || order.displayStatus !== "paid_partial") return 0;
  const subtotal = Math.max(0, Number(order.subtotalAmount ?? order.totalPrice ?? 0));
  const paid = Math.max(0, Number(order.partialPaidAmount ?? 0));
  return Math.max(0, subtotal - paid);
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

  const paidForCommission = isPaidDisplayStatus(normalized.displayStatus);
  normalized.profitPercent = paidForCommission ? commissionRate : null;
  normalized.profitAmount = paidForCommission ? totalAmount * (commissionRate / 100) : null;

  return normalized;
}
