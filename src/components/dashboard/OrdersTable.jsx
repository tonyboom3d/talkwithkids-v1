import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  CreditCard,
  Link2,
  MessageCircleMore,
  MoreHorizontal,
  Package,
  Phone,
  Search,
  Tag,
  Trash2,
  UserRound,
  Workflow,
} from "lucide-react";
import { TableSkeleton } from "./LoadingSkeleton";

const PAGE_SIZE = 8;

const STATUS_CONFIG = {
  sent: { label: "נשלח", className: "bg-slate-100 text-slate-600" },
  opened: { label: "נפתח", className: "bg-yellow-100 text-yellow-700" },
  unpaid: { label: "לא שולם", className: "bg-red-100 text-red-700" },
  cancelled: { label: "בוטל", className: "bg-gray-100 text-gray-500" },
  error: { label: "שגיאה", className: "bg-red-100 text-red-700" },
  paid: { label: "שולם", className: "bg-emerald-100 text-emerald-700" },
};

const STATUS_UPDATE_OPTIONS = ["sent", "opened", "paid", "cancelled", "error"];

function safeParseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function getDisplayStatus(order) {
  if (order.status && STATUS_CONFIG[order.status]) {
    return order.status;
  }

  if (order.linkCancelled) return "cancelled";
  if (order.errors) return "error";
  if (order.paymentStatus === "paid") return "paid";

  if (order.status === "opened" || order.timeline.some((event) => (event.action || event.type) === "link_opened")) {
    return "opened";
  }

  if (order.orderDate) {
    const daysSinceCreation = moment().diff(moment(order.orderDate), "days");
    if (daysSinceCreation >= 3 && order.paymentStatus !== "paid") {
      return "unpaid";
    }
  }

  return "sent";
}

function getCouponSummary(couponDetails) {
  if (!couponDetails) return "ללא קופון";
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

function normalizeOrder(order) {
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
    totalAmount: Number(order.totalPrice ?? order.total ?? 0),
  };

  normalized.displayStatus = getDisplayStatus(normalized);
  normalized.statusCfg = STATUS_CONFIG[normalized.displayStatus] || STATUS_CONFIG.sent;
  normalized.couponSummary = getCouponSummary(couponDetails);
  return normalized;
}

function timelineDotClass(action) {
  switch (action) {
    case "paid":
      return "bg-emerald-500";
    case "cancelled":
    case "deleted":
    case "failed":
      return "bg-red-500";
    case "opened":
    case "link_opened":
      return "bg-amber-500";
    case "note":
      return "bg-violet-500";
    default:
      return "bg-slate-400";
  }
}

function ActionButton({ icon: Icon, label, onClick, className = "", disabled = false }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`gap-1.5 h-8 text-xs ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}

export default function OrdersTable({
  orders,
  isLoading,
  onSelectOrder,
  onResendWhatsapp,
  onUpdateStatus,
  onDeleteOrder,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [statusOrder, setStatusOrder] = useState(null);
  const [deleteOrderState, setDeleteOrderState] = useState(null);
  const [pendingStatus, setPendingStatus] = useState("sent");
  const [busyAction, setBusyAction] = useState({ type: "", rowId: "" });

  const normalizedOrders = useMemo(
    () => (orders || []).map(normalizeOrder),
    [orders]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalizedOrders;
    return normalizedOrders.filter((order) => {
      const name = order.customerName.toLowerCase();
      const phone = String(order.customerPhone || "");
      const email = String(order.customer?.email || order.customerEmail || "").toLowerCase();
      const creator = String(order.creatorName || "").toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        creator.includes(q)
      );
    });
  }, [normalizedOrders, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleCopyLink = async (order) => {
    if (!order.checkoutLink) {
      toast.error("אין קישור זמין להעתקה");
      return;
    }
    await navigator.clipboard.writeText(order.checkoutLink);
    toast.success("הקישור הועתק");
  };

  const runRowAction = async (type, order, action) => {
    try {
      setBusyAction({ type, rowId: order.rowId });
      await action();
    } finally {
      setBusyAction({ type: "", rowId: "" });
    }
  };

  const openStatusDialog = (order) => {
    setStatusOrder(order);
    setPendingStatus(order.displayStatus === "unpaid" ? "sent" : order.displayStatus);
  };

  const handleConfirmStatus = async () => {
    if (!statusOrder || !onUpdateStatus) return;
    await runRowAction("status", statusOrder, async () => {
      await onUpdateStatus(statusOrder.rowId, pendingStatus);
      setStatusOrder(null);
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteOrderState || !onDeleteOrder) return;
    await runRowAction("delete", deleteOrderState, async () => {
      await onDeleteOrder(deleteOrderState.rowId);
      if (expandedRowId === deleteOrderState.rowId) {
        setExpandedRowId(null);
      }
      setDeleteOrderState(null);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap" dir="rtl">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 shrink-0">
          <CreditCard className="w-4 h-4 text-slate-400" />
          הזמנות אחרונות
        </h3>
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
          <Badge variant="outline" className="text-slate-500 border-slate-200 text-xs shrink-0">
            {filtered.length} הזמנות
          </Badge>
          <div className="relative max-w-sm w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש לפי שם, טלפון, מס׳ הזמנה או יוצרת ההזמנה..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pr-9 h-9 text-sm border-slate-200 text-right"
              dir="rtl"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center">
          <CreditCard className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm text-slate-400">{search ? "לא נמצאו תוצאות לחיפוש" : "אין הזמנות עדיין"}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="text-right text-xs font-medium text-slate-500 w-12" />
                  <TableHead className="text-right text-xs font-medium text-slate-500 min-w-[140px]">תאריך שליחה</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500 min-w-[160px]">שם לקוח</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500 min-w-[120px]">טלפון</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500 min-w-[120px]">עלות הזמנה</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500 min-w-[120px]">סטטוס</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500 min-w-[140px]">מס׳ הזמנה</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500 min-w-[140px]">מי יצר/ה</TableHead>
                  <TableHead className="text-left text-xs font-medium text-slate-500 w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((order) => {
                  const isExpanded = expandedRowId === order.rowId;
                  const isBusy = busyAction.rowId === order.rowId;

                  return (
                    <React.Fragment key={order.rowId}>
                      <TableRow className="group hover:bg-slate-50/70">
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 opacity-0 transition-all hover:bg-slate-100 group-hover:opacity-100 focus:opacity-100"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52" dir="rtl">
                              <DropdownMenuItem
                                disabled={!order.checkoutLink || !onResendWhatsapp || isBusy}
                                onClick={() => runRowAction("resend", order, () => onResendWhatsapp(order.rowId))}
                              >
                                <MessageCircleMore className="w-4 h-4" />
                                שליחה חוזרת לוואטסאפ
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!order.checkoutLink}
                                onClick={() => handleCopyLink(order)}
                              >
                                <Copy className="w-4 h-4" />
                                העתקת קישור
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!onUpdateStatus || isBusy}
                                onClick={() => openStatusDialog(order)}
                              >
                                <Workflow className="w-4 h-4" />
                                שינוי סטטוס
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-700"
                                disabled={!onDeleteOrder || isBusy}
                                onClick={() => setDeleteOrderState(order)}
                              >
                                <Trash2 className="w-4 h-4" />
                                מחיקה
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {order.sentDate ? moment(order.sentDate).format("DD/MM/YY HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">
                          {order.customerName || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 text-right tabular-nums" dir="ltr">
                          {order.customerPhone || "—"}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                          ₪{order.totalAmount.toLocaleString("he-IL")}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[11px] border-0 font-medium ${order.statusCfg.className}`}>
                            {order.statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {order.creatorName || "—"}
                        </TableCell>
                        <TableCell className="text-left">
                          <button
                            type="button"
                            onClick={() => setExpandedRowId(isExpanded ? null : order.rowId)}
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100"
                            aria-label={isExpanded ? "סגור פרטים" : "פתח פרטים"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                          <TableCell colSpan={9} className="p-4">
                            <AnimatePresence initial={false}>
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 space-y-5">
                                  <div className="flex flex-wrap items-center justify-between gap-3" dir="rtl">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <ActionButton
                                        icon={MessageCircleMore}
                                        label="שליחה חוזרת לוואטסאפ"
                                        disabled={!order.checkoutLink || !onResendWhatsapp || isBusy}
                                        onClick={() => runRowAction("resend", order, () => onResendWhatsapp(order.rowId))}
                                      />
                                      <ActionButton
                                        icon={Copy}
                                        label="העתקת קישור"
                                        disabled={!order.checkoutLink}
                                        onClick={() => handleCopyLink(order)}
                                      />
                                      <ActionButton
                                        icon={Workflow}
                                        label="שינוי סטטוס"
                                        disabled={!onUpdateStatus || isBusy}
                                        onClick={() => openStatusDialog(order)}
                                      />
                                      <ActionButton
                                        icon={Trash2}
                                        label="מחיקה"
                                        disabled={!onDeleteOrder || isBusy}
                                        onClick={() => setDeleteOrderState(order)}
                                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                      />
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-slate-800">{order.customerName || "ללא שם"}</p>
                                      <p className="text-xs text-slate-400">{order.orderNumber}</p>
                                    </div>
                                  </div>

                                  <div className="grid gap-4 xl:grid-cols-3">
                                    <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                                      <div className="flex items-center gap-2 justify-end">
                                        <span className="text-sm font-semibold text-slate-700">{order.customerName || "—"}</span>
                                        <UserRound className="w-4 h-4 text-slate-400" />
                                      </div>
                                      <div className="flex items-center gap-2 justify-end">
                                        <span className="text-sm text-slate-600 text-right tabular-nums" dir="ltr">{order.customerPhone || "—"}</span>
                                        <Phone className="w-4 h-4 text-slate-400" />
                                      </div>
                                      <div className="flex items-center gap-2 justify-end">
                                        <span className="text-sm text-slate-600">{order.creatorName || "—"}</span>
                                        <UserRound className="w-4 h-4 text-slate-400" />
                                      </div>
                                      <div className="flex items-center gap-2 justify-end">
                                        <span className="text-sm text-slate-600">{order.orderDate ? moment(order.orderDate).format("DD/MM/YYYY HH:mm") : "—"}</span>
                                        <CalendarDays className="w-4 h-4 text-slate-400" />
                                      </div>
                                      <div className="flex items-center gap-2 justify-end">
                                        <span className="text-sm text-slate-600">{order.couponSummary}</span>
                                        <Tag className="w-4 h-4 text-slate-400" />
                                      </div>
                                      {order.checkoutLink && (
                                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                                          <div className="flex items-center gap-2 justify-end mb-1">
                                            <Link2 className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs font-medium text-slate-500">קישור תשלום</span>
                                          </div>
                                          <p className="text-xs text-slate-500 break-all" dir="ltr">{order.checkoutLink}</p>
                                        </div>
                                      )}
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                                      <div className="flex items-center gap-2 justify-end">
                                        <span className="text-sm font-semibold text-slate-700">מוצרים</span>
                                        <Package className="w-4 h-4 text-slate-400" />
                                      </div>
                                      <div className="space-y-2">
                                        {order.products.length > 0 ? order.products.map((product, index) => (
                                          <div key={`${order.rowId}-product-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                              <span className="text-sm font-semibold text-slate-700">
                                                ₪{Number((product.price || 0) * (product.quantity || 0)).toLocaleString("he-IL")}
                                              </span>
                                              <div className="text-right">
                                                <p className="text-sm text-slate-700">{product.name || "מוצר"}</p>
                                                <p className="text-xs text-slate-400">כמות: {product.quantity || 1}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )) : (
                                          <p className="text-sm text-slate-400 text-right">אין פרטי מוצרים להצגה</p>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                                        <span className="text-base font-bold text-slate-800">
                                          ₪{order.totalAmount.toLocaleString("he-IL")}
                                        </span>
                                        <span className="text-sm text-slate-500">סה״כ הזמנה</span>
                                      </div>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                                      <div className="flex items-center gap-2 justify-end">
                                        <span className="text-sm font-semibold text-slate-700">פרטים נוספים</span>
                                        <CreditCard className="w-4 h-4 text-slate-400" />
                                      </div>
                                      <div className="space-y-2 text-right">
                                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                          <p className="text-xs text-slate-400 mb-1">סטטוס נוכחי</p>
                                          <Badge className={`text-[11px] border-0 font-medium ${order.statusCfg.className}`}>
                                            {order.statusCfg.label}
                                          </Badge>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                          <p className="text-xs text-slate-400 mb-1">מס׳ הזמנה</p>
                                          <p className="text-sm font-mono text-slate-600">{order.orderNumber}</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                          <p className="text-xs text-slate-400 mb-1">קופון</p>
                                          <p className="text-sm text-slate-600">{order.couponSummary}</p>
                                        </div>
                                        {order.orderChangeNotes && (
                                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                            <p className="text-xs text-amber-700 mb-1">שינויים להזמנה</p>
                                            <p className="text-sm text-amber-900">{order.orderChangeNotes}</p>
                                          </div>
                                        )}
                                        {order.notes && (
                                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <p className="text-xs text-slate-400 mb-1">הערות פנימיות</p>
                                            <p className="text-sm text-slate-600">{order.notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center gap-2 justify-end mb-4">
                                      <span className="text-sm font-semibold text-slate-700">תרשים זרימה</span>
                                      <Workflow className="w-4 h-4 text-slate-400" />
                                    </div>
                                    {order.timeline.length > 0 ? (
                                      <div className="space-y-3">
                                        {order.timeline.map((event, index) => {
                                          const action = event.action || event.type || "event";
                                          return (
                                            <div key={`${order.rowId}-timeline-${index}`} className="flex items-start gap-3">
                                              <div className="flex flex-col items-center shrink-0">
                                                <div className={`h-2.5 w-2.5 rounded-full ${timelineDotClass(action)}`} />
                                                {index < order.timeline.length - 1 && (
                                                  <div className="w-px min-h-[38px] bg-slate-200" />
                                                )}
                                              </div>
                                              <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-right">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                  <span className="text-xs text-slate-400">
                                                    {event.date ? moment(event.date).format("DD/MM/YY HH:mm") : "—"}
                                                  </span>
                                                  <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                                                    {event.by || "מערכת"}
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-slate-700">
                                                  {event.text || event.detail || "עודכן אירוע בהזמנה"}
                                                </p>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-400 text-right">אין תרשים זרימה זמין להזמנה זו</p>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            </AnimatePresence>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between" dir="rtl">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                disabled={page === totalPages}
                className="gap-1 text-xs text-slate-600 h-8"
              >
                <ChevronRight className="w-4 h-4" />
                הבא
              </Button>
              <span className="text-xs text-slate-400">
                עמוד {page} מתוך {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page === 1}
                className="gap-1 text-xs text-slate-600 h-8"
              >
                הקודם
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(statusOrder)} onOpenChange={(open) => !open && setStatusOrder(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">שינוי סטטוס הזמנה</DialogTitle>
            <DialogDescription className="text-right">
              בחרי את הסטטוס החדש עבור {statusOrder?.customerName || "ההזמנה"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_UPDATE_OPTIONS.map((statusKey) => {
              const config = STATUS_CONFIG[statusKey];
              const isSelected = pendingStatus === statusKey;
              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setPendingStatus(statusKey)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={handleConfirmStatus}
              disabled={busyAction.type === "status"}
            >
              שמירת סטטוס
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStatusOrder(null)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteOrderState)} onOpenChange={(open) => !open && setDeleteOrderState(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">מחיקת הזמנה</DialogTitle>
            <DialogDescription className="text-right">
              מחיקת ההזמנה תסיר אותה מלוח הבקרה ותבטל את הגישה של הלקוח/ה לקישור התשלום הקיים. לא ניתן לשחזר את הפעולה לאחר האישור.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-right">
            ההזמנה של {deleteOrderState?.customerName || "הלקוח/ה"} תימחק לצמיתות.
          </div>
          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
              disabled={busyAction.type === "delete"}
            >
              כן, למחוק את ההזמנה
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDeleteOrderState(null)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
