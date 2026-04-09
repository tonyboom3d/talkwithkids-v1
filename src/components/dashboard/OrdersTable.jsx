import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  MessageCircleMore,
  MessageSquarePlus,
  MoreHorizontal,
  Package,
  Phone,
  Search,
  Tag,
  UserRound,
  Workflow,
  XCircle,
} from "lucide-react";
import { TableSkeleton } from "./LoadingSkeleton";
import {
  normalizeOrder,
  STATUS_CONFIG,
  STATUS_UPDATE_OPTIONS,
  isPaidDisplayStatus,
} from "@/utils/dashboardOrders";
import { creatorTagStyleFromColor } from "@/utils/employeeTagStyle";

const PAGE_SIZE = 8;
function timelineDotClass(action) {
  switch (action) {
    case "paid":
      return "bg-emerald-500";
    case "cancelled":
    case "deleted":
    case "error":
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

function getActorBadgeText(event) {
  if (event.actorType === "customer" || String(event.by || "").includes("לקוח")) return "לקוח/ה";
  if (event.actorType === "system" || String(event.by || "") === "מערכת") return "מערכת";
  return "משתמש/ת מורשה";
}

function ActionButton({ icon: Icon, label, onClick, className = "", variant = "outline", disabled = false }) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
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
  onCopyToClipboard,
  onResendWhatsapp,
  onUpdateStatus,
  onDeleteOrder,
  onAddNote,
  showProfitColumn = false,
  commissionRate = 0,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [statusOrder, setStatusOrder] = useState(null);
  const [deleteOrderState, setDeleteOrderState] = useState(null);
  const [pendingStatus, setPendingStatus] = useState("sent");
  const [busyAction, setBusyAction] = useState({ type: "", rowId: "" });
  const [noteDrafts, setNoteDrafts] = useState({});
  const [resendConfirmOrder, setResendConfirmOrder] = useState(null);

  const normalizedOrders = useMemo(
    () => (orders || []).map((order) => normalizeOrder(order, { commissionRate })),
    [orders, commissionRate]
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
    if (!order.publicOrderUrl) {
      toast.error("אין קישור זמין להעתקה");
      return;
    }
    await onCopyToClipboard?.(order.publicOrderUrl);
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

  const handleConfirmResendWhatsapp = async () => {
    if (!resendConfirmOrder || !onResendWhatsapp) return;
    await runRowAction("resend", resendConfirmOrder, async () => {
      await onResendWhatsapp(resendConfirmOrder.rowId);
      setResendConfirmOrder(null);
    });
  };

  const handleSaveNote = async (order) => {
    const noteText = String(noteDrafts[order.rowId] || "").trim();
    if (!noteText || !onAddNote) return;
    await runRowAction("note", order, async () => {
      await onAddNote(order.rowId, noteText);
      setNoteDrafts((prev) => ({ ...prev, [order.rowId]: "" }));
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
                  <TableHead className="text-right text-xs font-medium text-slate-500 min-w-[120px]">סה"כ הזמנה</TableHead>
                  {showProfitColumn && (
                    <TableHead className="text-right text-xs font-medium text-slate-500 min-w-[140px]">רווח עמלה</TableHead>
                  )}
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
                  const isCancelled = order.displayStatus === "cancelled";
                  const isError = order.displayStatus === "error";
                  return (
                    <React.Fragment key={order.rowId}>
                      <TableRow
                        className="group cursor-pointer hover:bg-slate-50/70"
                        onClick={() => setExpandedRowId(isExpanded ? null : order.rowId)}
                      >
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(event) => event.stopPropagation()}
                                disabled={isError}
                                className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 opacity-0 transition-all hover:bg-slate-100 group-hover:opacity-100 focus:opacity-100"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52" dir="rtl">
                              <DropdownMenuItem
                                disabled={!order.checkoutLink || !onResendWhatsapp || isBusy || isCancelled || isError}
                                className="bg-[#30D46B] text-black hover:bg-[#28b85f] focus:bg-[#28b85f] focus:text-black data-[highlighted]:bg-[#28b85f] data-[highlighted]:text-black"
                                onClick={() => setResendConfirmOrder(order)}
                              >
                                <MessageCircleMore className="w-4 h-4" />
                                שליחה חוזרת לוואטסאפ
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!order.publicOrderUrl || isError}
                                onClick={() => handleCopyLink(order)}
                              >
                                <Copy className="w-4 h-4" />
                                העתקת קישור
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!onUpdateStatus || isBusy || isError}
                                onClick={() => openStatusDialog(order)}
                              >
                                <Workflow className="w-4 h-4" />
                                שינוי סטטוס
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-700"
                                disabled={!onDeleteOrder || isBusy || isError}
                                onClick={() => setDeleteOrderState(order)}
                              >
                                <XCircle className="w-4 h-4" />
                                ביטול הזמנה
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
                        {showProfitColumn && (
                          <TableCell className="text-right whitespace-nowrap">
                            {isPaidDisplayStatus(order.displayStatus) ? (
                              <div>
                                <div className="text-sm font-semibold text-emerald-700">
                                  ₪{(order.profitAmount ?? 0).toLocaleString("he-IL")}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {order.profitPercent != null ? `${order.profitPercent}%` : "—"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">לא שולם</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge className={`text-[11px] border-0 font-medium ${order.statusCfg.className}`}>
                            {order.statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.creatorName && order.creatorName !== "—" ? (
                            <span
                              className={`inline-flex max-w-full items-center gap-1 rounded-full border py-0.5 pl-1.5 pr-2 text-[11px] font-medium text-slate-700 ${
                                order.creatorTagColor ? "" : "border-slate-200 bg-slate-50"
                              }`}
                              dir="ltr"
                              style={creatorTagStyleFromColor(order.creatorTagColor)}
                            >
                              <span className="min-w-0 truncate">{order.creatorName}</span>
                              <UserRound className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedRowId(isExpanded ? null : order.rowId);
                            }}
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100"
                            aria-label={isExpanded ? "סגור פרטים" : "פתח פרטים"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                          <TableCell colSpan={showProfitColumn ? 10 : 9} className="p-4">
                            <AnimatePresence initial={false}>
                              <motion.div
                                initial={{ opacity: 0, height: 0, y: -4, scale: 0.985 }}
                                animate={{ opacity: 1, height: "auto", y: 0, scale: 1 }}
                                exit={{ opacity: 0, height: 0, y: -4, scale: 0.985 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className="overflow-hidden"
                              >
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-3 md:p-4 space-y-4" dir="rtl">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-slate-800">{order.customerName || "ללא שם"}</p>
                                      <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-xs text-slate-400">
                                        <span>{order.orderNumber}</span>
                                        <span>•</span>
                                        <span>{order.sentDate ? moment(order.sentDate).format("DD/MM/YYYY HH:mm") : "—"}</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                      <ActionButton
                                        icon={MessageCircleMore}
                                        label="שליחה חוזרת לוואטסאפ"
                                        disabled={!order.checkoutLink || !onResendWhatsapp || isBusy || isCancelled}
                                        className="border-[#30D46B] bg-[#30D46B] text-black hover:bg-[#28b85f] hover:text-black"
                                        onClick={() => setResendConfirmOrder(order)}
                                      />
                                      <ActionButton
                                        icon={Copy}
                                        label="העתקת קישור"
                                        disabled={!order.publicOrderUrl || !onCopyToClipboard}
                                        onClick={() => handleCopyLink(order)}
                                      />
                                      <ActionButton
                                        icon={Workflow}
                                        label="שינוי סטטוס"
                                        disabled={!onUpdateStatus || isBusy}
                                        onClick={() => openStatusDialog(order)}
                                      />
                                      <ActionButton
                                        icon={XCircle}
                                        label="ביטול"
                                        disabled={!onDeleteOrder || isBusy}
                                        onClick={() => setDeleteOrderState(order)}
                                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                      />
                                    </div>
                                  </div>

                                  {isError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-right text-sm text-red-700">
                                      ההזמנה נמצאת בסטטוס שגיאה. לא ניתן לבצע פעולות נוספות על הרשומה הזו, ויש ליצור רשומה חדשה.
                                    </div>
                                  )}

                                  {isCancelled && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-right text-sm text-red-700">
                                      ההזמנה בוטלה. קישור התשלום נשאר ברשומה לצורכי מעקב, אבל לא ניתן לשלוח אותו שוב בוואטסאפ.
                                    </div>
                                  )}

                                  <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                                    <div className="space-y-3">
                                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-right">
                                          <div className="mb-1 flex items-center justify-end gap-2 text-xs text-slate-400">
                                            <UserRound className="w-3.5 h-3.5" />
                                            <span>לקוח</span>
                                          </div>
                                          <p className="text-sm font-medium text-slate-700">{order.customerName || "—"}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-right">
                                          <div className="mb-1 flex items-center justify-end gap-2 text-xs text-slate-400">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span>טלפון</span>
                                          </div>
                                          <p className="text-sm text-slate-700 tabular-nums" dir="ltr">{order.customerPhone || "—"}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-right">
                                          <div className="mb-1 flex items-center justify-end gap-2 text-xs text-slate-400">
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            <span>תאריך יצירה</span>
                                          </div>
                                          <p className="text-sm text-slate-700">{order.orderDate ? moment(order.orderDate).format("DD/MM/YYYY HH:mm") : "—"}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-right">
                                          <div className="mb-1 flex items-center justify-end gap-2 text-xs text-slate-400">
                                            <Tag className="w-3.5 h-3.5" />
                                            <span>קופון</span>
                                          </div>
                                          <p className="text-sm text-slate-700">{order.couponSummary}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-right">
                                          <div className="mb-1 flex items-center justify-end gap-2 text-xs text-slate-400">
                                            <Workflow className="w-3.5 h-3.5" />
                                            <span>סטטוס</span>
                                          </div>
                                          <Badge className={`text-[11px] border-0 font-medium ${order.statusCfg.className}`}>
                                            {order.statusCfg.label}
                                          </Badge>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-right">
                                          <div className="mb-1 flex items-center justify-end gap-2 text-xs text-slate-400">
                                            <UserRound className="w-3.5 h-3.5" />
                                            <span>נוצרה על ידי</span>
                                          </div>
                                          {order.creatorName && order.creatorName !== "—" ? (
                                            <span
                                              className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium text-slate-800 ${
                                                order.creatorTagColor ? "" : "border-slate-200 bg-slate-50"
                                              }`}
                                              dir="ltr"
                                              style={creatorTagStyleFromColor(order.creatorTagColor)}
                                            >
                                              <span className="min-w-0 truncate">{order.creatorName}</span>
                                              <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                                            </span>
                                          ) : (
                                            <p className="text-sm text-slate-700">—</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                        <div className="mb-3 flex w-full items-center justify-end gap-2 text-right">
                                          <Package className="w-4 h-4 text-slate-400" />
                                          <span className="text-sm font-semibold text-slate-700">מוצרים</span>
                                        </div>
                                        <div className="space-y-2">
                                        {order.products.length > 0 ? order.products.map((product, index) => (
                                            <div key={`${order.rowId}-product-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
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
                                        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                                          <span className="text-base font-bold text-slate-800">
                                            ₪{order.totalAmount.toLocaleString("he-IL")}
                                          </span>
                                          <span className="text-sm text-slate-500">סה״כ הזמנה</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                        <div className="mb-2 flex w-full items-center justify-end gap-2 text-right">
                                          <CreditCard className="w-4 h-4 text-slate-400" />
                                          <span className="text-sm font-semibold text-slate-700">פרטים נוספים</span>
                                        </div>
                                        <div className="space-y-2 text-right">
                                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                            <p className="text-xs text-slate-400 mb-1">מס׳ הזמנה</p>
                                            <p className="text-sm font-mono text-slate-600">{order.orderNumber}</p>
                                          </div>
                                          {order.orderChangeNotes && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                              <p className="text-xs text-amber-700 mb-1">שינויים בערכה</p>
                                              <p className="text-sm text-amber-900">{order.orderChangeNotes}</p>
                                            </div>
                                          )}
                                          {order.notes && (
                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                              <p className="text-xs text-slate-400 mb-1">הערות פנימיות</p>
                                              <p className="text-sm text-slate-600">{order.notes}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                        <div className="mb-3 flex w-full items-center justify-end gap-2 text-right">
                                          <Workflow className="w-4 h-4 text-slate-400" />
                                          <span className="text-sm font-semibold text-slate-700">תרשים זרימה</span>
                                        </div>
                                        {order.timeline.length > 0 ? (
                                          <div className="space-y-2.5">
                                            {order.timeline.map((event, index) => {
                                              const action = event.action || event.type || "event";
                                              return (
                                                <div key={`${order.rowId}-timeline-${index}`} className="flex items-start gap-2.5">
                                                  <div className="flex flex-col items-center shrink-0">
                                                    <div className={`h-2.5 w-2.5 rounded-full ${timelineDotClass(action)}`} />
                                                    {index < order.timeline.length - 1 && (
                                                      <div className="w-px min-h-[28px] bg-slate-200" />
                                                    )}
                                                  </div>
                                                  <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                                                    <div className="mb-1 flex items-center justify-between gap-2">
                                                      <span className="text-[11px] text-slate-400">
                                                        {event.date ? moment(event.date).format("DD/MM/YY HH:mm") : "—"}
                                                      </span>
                                                      <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                                                        {event.actorType === "employee" && event.by
                                                          ? `${getActorBadgeText(event)} · ${event.by}`
                                                          : getActorBadgeText(event)}
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

                                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                        <div className="mb-3 flex w-full items-center justify-end gap-2 text-right">
                                          <MessageSquarePlus className="w-4 h-4 text-slate-400" />
                                          <span className="text-sm font-semibold text-slate-700">הוספת הערה</span>
                                        </div>
                                        <div className="space-y-2">
                                          <Textarea
                                            value={noteDrafts[order.rowId] || ""}
                                            onChange={(event) =>
                                              setNoteDrafts((prev) => ({ ...prev, [order.rowId]: event.target.value }))
                                            }
                                            placeholder="כתבי הערה שתתווסף לתרשים הזרימה..."
                                            className="min-h-[76px] resize-none border-slate-200 bg-white text-right"
                                            dir="rtl"
                                            disabled={!onAddNote || isBusy || isError}
                                          />
                                          <div className="flex items-center justify-end">
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                handleSaveNote(order);
                                              }}
                                              disabled={!String(noteDrafts[order.rowId] || "").trim() || !onAddNote || isBusy || isError}
                                              className="bg-slate-900 hover:bg-slate-800 text-white"
                                            >
                                              שמירת הערה
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
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

      <Dialog
        open={Boolean(resendConfirmOrder)}
        onOpenChange={(open) => !open && busyAction.type !== "resend" && setResendConfirmOrder(null)}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">שליחה חוזרת לוואטסאפ</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              האם לשלוח שוב הודעת וואטסאפ עם פרטי ההזמנה והקישור ללקוח/ה?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 text-right">
            <p className="mb-1 text-xs text-slate-500">ההודעה תישלח למספר הטלפון של הלקוח/ה</p>
            <p className="font-mono text-base tabular-nums" dir="ltr">
              {resendConfirmOrder?.customerPhone || "—"}
            </p>
          </div>
          <p className="text-xs text-slate-500 text-right">
            לאחר האישור תתווסף רשומה לתרשים הזרימה.
          </p>
          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-[#30D46B] text-black hover:bg-[#28b85f] font-medium"
              onClick={handleConfirmResendWhatsapp}
              disabled={busyAction.type === "resend" || !onResendWhatsapp}
            >
              {busyAction.type === "resend" ? (
                <span className="text-black">שולח...</span>
              ) : (
                "אישור שליחה"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setResendConfirmOrder(null)}
              disabled={busyAction.type === "resend"}
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteOrderState)} onOpenChange={(open) => !open && setDeleteOrderState(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">ביטול הזמנה</DialogTitle>
            <DialogDescription className="text-right">
              ביטול ההזמנה יעדכן את הסטטוס ל״בוטל״, ישאיר את הרשומה בלוח הבקרה, ויחסום שליחה חוזרת של הקישור לוואטסאפ.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-right">
            לאחר האישור ההזמנה של {deleteOrderState?.customerName || "הלקוח/ה"} תסומן כ״בוטלה״ והקישור לא יהיה זמין יותר לשליחה חוזרת בוואטסאפ.
          </div>
          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
              disabled={busyAction.type === "delete"}
            >
              כן, לבטל את ההזמנה
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
