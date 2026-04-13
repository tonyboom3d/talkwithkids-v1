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

export function filterOrdersByCreators(orders = [], canViewOthers, includeAllCreators, selectedCreatorKeys) {
  if (!canViewOthers || includeAllCreators) {
    return orders;
  }

  return (orders || []).filter((order) => selectedCreatorKeys.has(getOrderCreatorKey(order)));
}
