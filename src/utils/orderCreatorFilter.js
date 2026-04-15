import { safeParseJson } from "@/utils/dashboardOrders";

function resolveTimelineCreator(order) {
  const timeline = Array.isArray(order?.timeline)
    ? order.timeline
    : safeParseJson(order?.changeChain, []);

  return String(
    timeline.find((event) => (event.action || event.type) === "created")?.by || ""
  ).trim();
}

export function getOrderCreatorKey(order) {
  const createdByRef = String(order?.createdByRef || "").trim();
  if (createdByRef) return createdByRef;

  const creatorName = String(
    order?.createdByName || order?.creatorName || resolveTimelineCreator(order)
  ).trim();

  return creatorName || "__none__";
}

export function getOrderCreatorLabel(order) {
  const creatorName = String(
    order?.createdByName || order?.creatorName || resolveTimelineCreator(order)
  ).trim();

  return creatorName || "לא ידוע";
}

function normalizeComparableName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function orderBelongsToCurrentUser(order, currentUser) {
  if (!currentUser) return true;

  const currentUserId = String(
    currentUser?.id || currentUser?.employeeId || currentUser?.createdByRef || ""
  ).trim();
  if (currentUserId && getOrderCreatorKey(order) === currentUserId) {
    return true;
  }

  const currentUserName = normalizeComparableName(
    currentUser?.displayName || currentUser?.name || ""
  );
  if (!currentUserName) return false;

  return normalizeComparableName(getOrderCreatorLabel(order)) === currentUserName;
}

export function buildCreatorOptions(orders = []) {
  const creatorMap = new Map();

  (orders || []).forEach((order) => {
    const key = getOrderCreatorKey(order);
    if (!creatorMap.has(key)) {
      creatorMap.set(key, getOrderCreatorLabel(order));
    }
  });

  return Array.from(creatorMap.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "he"));
}

export function filterOrdersByCreators(
  orders = [],
  canViewOthers,
  includeAllCreators,
  selectedCreatorKeys,
  currentUser = null
) {
  const safeOrders = orders || [];

  if (!canViewOthers) {
    return safeOrders.filter((order) => orderBelongsToCurrentUser(order, currentUser));
  }

  if (includeAllCreators) {
    return safeOrders;
  }

  return safeOrders.filter((order) => selectedCreatorKeys.has(getOrderCreatorKey(order)));
}
