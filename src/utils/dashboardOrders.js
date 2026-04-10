import { computeDisplayTotalAfterCoupon } from "@/utils/orderTotals";

export const PUBLIC_ORDER_BASE_URL = "https://www.talkwithkids.co.il/dashboard-orders";

export const STATUS_CONFIG = {
  sent: { label: "נשלח", className: "bg-slate-100 text-slate-600" },
  opened: { label: "נפתח", className: "bg-orange-100 text-orange-700" },
  unpaid: { label: "לא שולם", className: "bg-red-100 text-red-700" },
  cancelled: { label: "בוטל", className: "bg-red-100 text-red-700" },
  error: { label: "שגיאה", className: "bg-red-100 text-red-700" },
  paid_pending_details: { label: "שולמה - לא הושלמה", className: "bg-violet-100 text-violet-700" },
  paid_completed: { label: "שולמה - הושלמה", className: "bg-emerald-100 text-emerald-700" },
  paid: { label: "שולם", className: "bg-emerald-100 text-emerald-700" },
};

export const STATUS_UPDATE_OPTIONS = ["sent", "opened", "paid_pending_details", "paid_completed", "paid", "cancelled"];

export const SALES_STATUS_FILTERS = [
  "sent",
  "opened",
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
    return "שולם מראש - קופון 100% להשלמת פרטים";
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
  return status === "paid" || status === "paid_pending_details" || status === "paid_completed";
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
  const orderNumber = order.orderNumber && String(order.orderNumber).trim()
    ? String(order.orderNumber).trim()
    : "ממתין לתשלום";
  const deliveryNumber = order.deliveryNumber && String(order.deliveryNumber).trim()
    ? String(order.deliveryNumber).trim()
    : "—";
  const creatorName =
    order.createdByName ||
    timeline.find((event) => (event.action || event.type) === "created")?.by ||
    "—";

  const rawSubtotal = Number(order.totalPrice ?? order.total ?? 0);
  const totalAmount = computeDisplayTotalAfterCoupon(rawSubtotal, couponDetails);
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
    orderNumber,
    deliveryNumber,
    creatorName,
    creatorTagColor: order.creatorTagColor || "",
    checkoutLink: order.checkoutLink || order.paymentLink || "",
    publicOrderUrl: order.orderUrl || buildPublicOrderUrl(resolveDynamicLinkId(order)),
    subtotalAmount: rawSubtotal,
    totalAmount,
    whatsappData,
  };

  normalized.displayStatus = getDisplayStatus(normalized);
  normalized.statusCfg = STATUS_CONFIG[normalized.displayStatus] || STATUS_CONFIG.sent;
  normalized.couponSummary = getCouponSummary(couponDetails);
  normalized.whatsappDeliveryStatus = resolveWhatsappDeliveryStatus(normalized);

  const paidForCommission = isPaidDisplayStatus(normalized.displayStatus);
  normalized.profitPercent = paidForCommission ? commissionRate : null;
  normalized.profitAmount = paidForCommission ? totalAmount * (commissionRate / 100) : null;

  return normalized;
}
