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

export function buildPublicOrderUrl(orderId) {
  return orderId ? `${PUBLIC_ORDER_BASE_URL}/${encodeURIComponent(orderId)}` : "";
}

function readNumericValue(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function getProductUnitCost(product) {
  if (!product || typeof product !== "object") return null;

  const candidateValues = [
    product.costPrice,
    product.cost,
    product.purchasePrice,
    product.unitCost,
    product.productCost,
    product.costPerUnit,
    product.cost_price,
  ];

  for (const candidate of candidateValues) {
    const numeric = readNumericValue(candidate);
    if (numeric != null) {
      return Math.max(0, numeric);
    }
  }

  return null;
}

function getOrderCostSummary(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      costAmount: null,
      partialCostAmount: null,
      hasAnyCostData: false,
      hasFullCostData: false,
    };
  }

  let total = 0;
  let hasAnyCostData = false;
  let hasMissingCost = false;

  for (const product of products) {
    const quantity = Math.max(1, Number(product?.quantity || 1));
    const unitCost = getProductUnitCost(product);
    if (unitCost == null) {
      hasMissingCost = true;
      continue;
    }
    hasAnyCostData = true;
    total += unitCost * quantity;
  }

  return {
    costAmount: hasAnyCostData && !hasMissingCost ? total : null,
    partialCostAmount: hasAnyCostData ? total : null,
    hasAnyCostData,
    hasFullCostData: hasAnyCostData && !hasMissingCost,
  };
}

function computeProfitPercent(profitAmount, costAmount) {
  const profit = readNumericValue(profitAmount);
  const cost = readNumericValue(costAmount);
  if (profit == null || cost == null || cost <= 0) return null;
  return (profit / cost) * 100;
}

export function isPaidDisplayStatus(status) {
  return status === "paid" || status === "paid_pending_details" || status === "paid_completed";
}

export function normalizeOrder(order) {
  const timeline = Array.isArray(order.timeline)
    ? order.timeline
    : safeParseJson(order.changeChain, []);
  const products = Array.isArray(order.products)
    ? order.products
    : safeParseJson(order.products, []);
  const couponDetails = safeParseJson(order.couponDetails, null);
  const customerName = order.customer
    ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim()
    : (order.customerName || "").trim();
  const customerPhone = order.customer?.phone || order.customerPhone || "";
  const orderDate = order._createdDate || order.date || "";
  const sentDate = timeline.find((event) => (event.action || event.type) === "sent")?.date || orderDate;
  const orderNumber = order.orderNumber && String(order.orderNumber).trim()
    ? String(order.orderNumber).trim()
    : "ממתין לתשלום";
  const creatorName =
    order.createdByName ||
    timeline.find((event) => (event.action || event.type) === "created")?.by ||
    "—";

  const rawSubtotal = Number(order.totalPrice ?? order.total ?? 0);
  const totalAmount = computeDisplayTotalAfterCoupon(rawSubtotal, couponDetails);
  const costSummary = getOrderCostSummary(products);
  const profitAmount = costSummary.hasFullCostData ? totalAmount - costSummary.costAmount : null;
  const profitPercent = costSummary.hasFullCostData
    ? computeProfitPercent(profitAmount, costSummary.costAmount)
    : null;

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
    creatorName,
    checkoutLink: order.checkoutLink || order.paymentLink || "",
    publicOrderUrl: order.orderUrl || buildPublicOrderUrl(order._id || order.id),
    subtotalAmount: rawSubtotal,
    totalAmount,
    orderCostAmount: costSummary.costAmount,
    partialOrderCostAmount: costSummary.partialCostAmount,
    hasAnyCostData: costSummary.hasAnyCostData,
    hasFullCostData: costSummary.hasFullCostData,
    profitAmount,
    profitPercent,
  };

  normalized.displayStatus = getDisplayStatus(normalized);
  normalized.statusCfg = STATUS_CONFIG[normalized.displayStatus] || STATUS_CONFIG.sent;
  normalized.couponSummary = getCouponSummary(couponDetails);
  return normalized;
}
