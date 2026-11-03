import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CreditCard,
  FileText,
  Mail,
  MessageSquarePlus,
  MoreHorizontal,
  Package,
  RefreshCw,
  Search,
  Smartphone,
  UserRound,
  Workflow,
} from "lucide-react";
import { TableSkeleton } from "./LoadingSkeleton";
import { useScrollToTopOnOpen } from "@/hooks/useScrollToTopOnOpen";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  normalizeOrder,
  STATUS_CONFIG,
  isPaidDisplayStatus,
  resolveRemainingBalance,
  resolveCompletePaymentDefault,
  canCompletePayment as isCompletablePaymentStatus,
  ROW_TONE_CLASSNAMES,
  formatShortName,
  formatCreatorFirstName,
  resolveInitialStatusLabel,
  inferLegacyInitialStatus,
} from "@/utils/dashboardOrders";
import { getOrderCreatorKey } from "@/utils/orderCreatorFilter";
import { PAYMENT_METHOD_OPTIONS, shouldSkipInvoiceForPaymentMethod } from "@/utils/paymentMethods";
import { resolveMinFutureDueDate } from "@/utils/israelDate";
import EmployeeAssignField from "./EmployeeAssignField";
import OrderActionsMenu from "./OrderActionsMenu";
import OrderCustomerDetails from "./OrderCustomerDetails";
import OrderProductsList from "./OrderProductsList";
import FulfillmentStatusIcon from "./FulfillmentStatusIcon";

const PAGE_SIZE = 8;
const TOP_DIALOG_CONTENT_CLASSNAME =
  "max-w-md top-4 left-[50%] max-h-[min(90vh,calc(100dvh-1rem))] translate-x-[-50%] translate-y-0 overflow-y-auto sm:top-6";

function timelineDotClass(action) {
  switch (action) {
    case "paid":
      return "bg-emerald-500";
    case "whatsapp_pending":
      return "bg-sky-500";
    case "whatsapp_sent_success":
      return "bg-emerald-500";
    case "whatsapp_sent_failed":
      return "bg-red-500";
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
    case "assignment_changed":
      return "bg-indigo-500";
    case "manual_partial_payment":
      return "bg-teal-500";
    default:
      return "bg-slate-400";
  }
}

function getActorBadgeText(event) {
  if (event.actorType === "customer" || String(event.by || "").includes("לקוח")) return "לקוח/ה";
  if (event.actorType === "system" || String(event.by || "") === "מערכת") return "מערכת";
  return "משתמש/ת מורשה";
}

/** תקציר אירוע לתרשים הזרימה — אירוע "created" מציג את הסטטוס ההתחלתי, לדוגמה "הזמנה נוצרה - שולמה חלקית" */
function formatTimelineEventSummary(event) {
  if (!event) return "אין עדכונים";
  const action = event.action || event.type;
  if (action === "created") {
    const initialStatus = event.initialStatus || inferLegacyInitialStatus(event.detail);
    const label = resolveInitialStatusLabel(initialStatus);
    return label ? `הזמנה נוצרה - ${label}` : "הזמנה נוצרה";
  }
  return event.text || event.detail || "עודכן אירוע בהזמנה";
}

function safeParseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== 'string') return Array.isArray(value) ? value : fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export default function OrdersTable({
  orders,
  isLoading,
  onCopyToClipboard,
  onResendWhatsapp,
  onDeleteOrder,
  onAddNote,
  onRefresh,
  lastRefreshedAt,
  showProfitColumn = false,
  commissionRate = 0,
  canGenerateInvoices = false,
  onGenerateInvoice,
  onResendInvoice,
  canViewOthers = false,
  employees = [],
  onUpdateAssignment,
  onCompletePartialPayment,
  onUpdateDeposit,
}) {
  const isMobile = useIsMobile();
  const minDueDate = resolveMinFutureDueDate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState(null);
  // מודול 1: עריכת תאריך יעד לתשלום יתרה inline בתוך השורה המורחבת
  const [editingDueDateRowId, setEditingDueDateRowId] = useState(null);
  const [dueDateDraft, setDueDateDraft] = useState("");
  const [deleteOrderState, setDeleteOrderState] = useState(null);
  const [busyAction, setBusyAction] = useState({ type: "", rowId: "" });
  const [noteDrafts, setNoteDrafts] = useState({});
  const [resendConfirmOrder, setResendConfirmOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [invoiceSendByEmail, setInvoiceSendByEmail] = useState(false);
  const [invoiceSendBySMS, setInvoiceSendBySMS] = useState(false);
  const [invoiceDuplicateOrder, setInvoiceDuplicateOrder] = useState(null);
  const [invoiceUnpaidWarningOrder, setInvoiceUnpaidWarningOrder] = useState(null);
  const [resendInvoiceOrder, setResendInvoiceOrder] = useState(null);
  const [resendInvoiceMethod, setResendInvoiceMethod] = useState("email");
  const [resendInvoiceDocId, setResendInvoiceDocId] = useState(null);
  const [assignOrderState, setAssignOrderState] = useState(null);
  const [pendingAssignEmployeeId, setPendingAssignEmployeeId] = useState("");
  const [partialPayOrder, setPartialPayOrder] = useState(null);
  const [partialPayAmount, setPartialPayAmount] = useState("");
  const [partialPayMethod, setPartialPayMethod] = useState("");
  const [partialPayNotes, setPartialPayNotes] = useState("");
  const [partialPayError, setPartialPayError] = useState("");

  const normalizedOrders = useMemo(
    () => (orders || []).map((order) => normalizeOrder(order, { commissionRate })),
    [orders, commissionRate]
  );

  useScrollToTopOnOpen(Boolean(resendConfirmOrder) || Boolean(deleteOrderState) || Boolean(invoiceOrder) || Boolean(invoiceDuplicateOrder) || Boolean(invoiceUnpaidWarningOrder) || Boolean(resendInvoiceOrder) || Boolean(assignOrderState) || Boolean(partialPayOrder));

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
        order.deliveryNumber.toLowerCase().includes(q) ||
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

  const openAssignDialog = (order) => {
    setAssignOrderState(order);
    setPendingAssignEmployeeId(getOrderCreatorKey(order));
  };

  const handleConfirmAssign = async () => {
    if (!assignOrderState || !onUpdateAssignment || !pendingAssignEmployeeId) return;
    if (pendingAssignEmployeeId === getOrderCreatorKey(assignOrderState)) {
      toast.error("ההזמנה כבר משויכת לעובד/ת זה/ו");
      return;
    }
    await runRowAction("assign", assignOrderState, async () => {
      await onUpdateAssignment(assignOrderState.rowId, pendingAssignEmployeeId);
      setAssignOrderState(null);
      setPendingAssignEmployeeId("");
    });
  };

  const openDueDateEditor = (order) => {
    setEditingDueDateRowId(order.rowId);
    setDueDateDraft(order.balanceDueDate ? moment(order.balanceDueDate).format("YYYY-MM-DD") : "");
  };

  const closeDueDateEditor = () => {
    setEditingDueDateRowId(null);
    setDueDateDraft("");
  };

  const handleSaveDueDate = async (order) => {
    if (!onUpdateDeposit) return;
    await runRowAction("dueDate", order, async () => {
      await onUpdateDeposit(order.rowId, { balanceDueDate: dueDateDraft || null });
      closeDueDateEditor();
    });
  };

  const openPartialPayDialog = (order) => {
    const remaining = resolveRemainingBalance(order);
    setPartialPayOrder(order);
    setPartialPayAmount(String(resolveCompletePaymentDefault(order)));
    setPartialPayMethod("");
    setPartialPayNotes("");
    setPartialPayError("");
  };

  const handleConfirmPartialPay = async () => {
    if (!partialPayOrder || !onCompletePartialPayment) return;
    const remaining = resolveRemainingBalance(partialPayOrder);
    const amount = Number(partialPayAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPartialPayError("הסכום חייב להיות גדול מ-0");
      return;
    }
    if (amount > remaining + 0.01) {
      setPartialPayError(`הסכום גדול מהיתרה (₪${remaining.toLocaleString("he-IL")})`);
      return;
    }
    if (!partialPayMethod) {
      setPartialPayError("יש לבחור אופן תשלום");
      return;
    }
    setPartialPayError("");

    await runRowAction("partialPay", partialPayOrder, async () => {
      await onCompletePartialPayment(partialPayOrder.rowId, {
        amountPaid: amount,
        paymentMethod: partialPayMethod,
        notes: partialPayNotes,
        generateInvoice: !shouldSkipInvoiceForPaymentMethod(partialPayMethod),
      });
      setPartialPayOrder(null);
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

  const getOrderInvoiceDocs = (order) => safeParseJson(order.invoiceDocuments, []);

  const renderInvoiceIndicator = (order, { compact = false } = {}) => {
    const docs = getOrderInvoiceDocs(order);
    if (!docs.length) return null;
    const latestDoc = docs[docs.length - 1];
    const docNumber = latestDoc?.docNumber || latestDoc?.docId || "";
    const docUrl = latestDoc?.url || "";
    const sizeClass = compact ? "h-6 w-6" : "h-7 w-7";
    const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";

    if (docs.length > 1) {
      return (
        <DropdownMenu>
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                    className={`relative inline-flex items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50 ${sizeClass}`}
                    aria-label={`${docs.length} חשבוניות`}
                  >
                    <FileText className={iconClass} />
                    <span className="absolute -top-1 -left-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[9px] font-bold leading-none text-white">
                      {docs.length}
                    </span>
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" dir="rtl">{`${docs.length} חשבוניות קיימות`}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="start" dir="rtl" onClick={(event) => event.stopPropagation()}>
            {[...docs].reverse().map((doc) => (
              <DropdownMenuItem
                key={doc.docId || doc.docNumber}
                disabled={!doc.url}
                onClick={() => doc.url && window.open(doc.url, "_blank", "noopener,noreferrer")}
              >
                <FileText className="w-4 h-4" />
                {formatInvoiceDocLabel(doc)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (docUrl) {
                  window.open(docUrl, "_blank", "noopener,noreferrer");
                }
              }}
              disabled={!docUrl}
              className={`inline-flex items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-default disabled:opacity-60 ${sizeClass}`}
              aria-label={docNumber ? `חשבונית מס׳ ${docNumber}` : "חשבונית"}
            >
              <FileText className={iconClass} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" dir="rtl">
            {docNumber ? `חשבונית מס׳ ${docNumber}` : "קיימת חשבונית"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const proceedToInvoiceFlow = (order) => {
    const docs = getOrderInvoiceDocs(order);
    if (docs.length > 0) {
      setInvoiceDuplicateOrder(order);
    } else {
      setInvoiceOrder(order);
      setInvoiceSendByEmail(false);
      setInvoiceSendBySMS(false);
    }
  };

  const openInvoiceDialog = (order) => {
    if (!isPaidDisplayStatus(order.displayStatus)) {
      setInvoiceUnpaidWarningOrder(order);
      return;
    }
    proceedToInvoiceFlow(order);
  };

  const handleConfirmUnpaidInvoice = () => {
    const order = invoiceUnpaidWarningOrder;
    if (!order) return;
    setInvoiceUnpaidWarningOrder(null);
    proceedToInvoiceFlow(order);
  };

  const handleConfirmGenerateInvoice = async (forceOverride = false) => {
    const order = forceOverride ? invoiceDuplicateOrder : invoiceOrder;
    if (!order || !onGenerateInvoice) return;
    await runRowAction("invoice", order, async () => {
      const result = await onGenerateInvoice(order.rowId, {
        isSendByEmail: invoiceSendByEmail,
        isSendSMS: invoiceSendBySMS,
        force: forceOverride,
      });
      if (result?.alreadyExists && !forceOverride) {
        setInvoiceOrder(null);
        setInvoiceDuplicateOrder(order);
        return;
      }
      setInvoiceOrder(null);
      setInvoiceDuplicateOrder(null);
    });
  };

  const handleConfirmResendInvoice = async () => {
    if (!resendInvoiceOrder || !onResendInvoice) return;
    const docs = getOrderInvoiceDocs(resendInvoiceOrder);
    const targetDoc = (resendInvoiceDocId != null
      ? docs.find((d) => String(d.docId) === String(resendInvoiceDocId))
      : null) || docs[docs.length - 1];
    if (!targetDoc) return;
    await runRowAction("resendInvoice", resendInvoiceOrder, async () => {
      await onResendInvoice(resendInvoiceOrder.rowId, targetDoc.docId, resendInvoiceMethod);
      setResendInvoiceOrder(null);
      setResendInvoiceDocId(null);
    });
  };

  const formatInvoiceDocLabel = (doc) => {
    const number = doc?.docNumber || doc?.docId || "";
    const date = doc?.createdAt ? moment(doc.createdAt).format("DD/MM/YY") : "";
    return date ? `חשבונית מס׳ ${number} — ${date}` : `חשבונית מס׳ ${number}`;
  };

  const resolveActualPaidAmount = (order) => {
    if (!isPaidDisplayStatus(order.displayStatus)) return 0;
    if (order.displayStatus === "paid_partial") return Math.max(0, Number(order.partialPaidAmount || 0));
    if (order.couponDetails?.source === "auto_paid" && Number(order.partialPaidAmount) > 0) {
      return Math.max(0, Number(order.partialPaidAmount || 0));
    }
    const fullyPaidAmount = order.couponDetails?.source === "auto_paid"
      ? Number(order.subtotalAmount ?? 0)
      : Number(order.totalAmount ?? 0);
    return Math.max(0, fullyPaidAmount);
  };

  const renderRemainingAmountCell = (order) => {
    const cancelledOrError = order.displayStatus === "cancelled" || order.displayStatus === "error";
    if (cancelledOrError) {
      return <span className="text-xs text-slate-400 whitespace-nowrap">—</span>;
    }

    let remainingAmount = 0;
    if (order.displayStatus === "paid_partial") {
      remainingAmount = Math.max(0, Number(order.remainingPaymentAmount ?? 0));
    } else if (isPaidDisplayStatus(order.displayStatus)) {
      remainingAmount = 0;
    } else {
      remainingAmount = Math.max(0, Number(order.totalAmount ?? 0));
    }

    return (
      <span className="text-sm font-semibold whitespace-nowrap text-[#C2410B]">
        ₪{remainingAmount.toLocaleString("he-IL")}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-visible"
    >
      <div className="px-3 py-3 md:px-6 md:py-4 border-b border-slate-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4 flex-wrap" dir="rtl">
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 shrink-0">
            <CreditCard className="w-4 h-4 text-slate-400" />
            הזמנות אחרונות
          </h3>
          {lastRefreshedAt && (
            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              עודכן לאחרונה: {moment(lastRefreshedAt).format("DD/MM/YY HH:mm:ss")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:flex-1 md:min-w-0 justify-end">
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-9 gap-2 border-slate-200 text-slate-600 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              ריענון
            </Button>
          )}
          <Badge variant="outline" className="text-slate-500 border-slate-200 text-xs shrink-0">
            {filtered.length} הזמנות
          </Badge>
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש לפי שם, טלפון, מס׳ הזמנה..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pr-9 h-9 text-sm border-slate-200 text-right w-full"
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
          <Table
            dir="rtl"
            containerClassName="orders-table-scroll"
            className="w-full min-w-0 table-fixed"
          >
              <colgroup>
                <col style={{ width: "2.75rem" }} />
                <col />
                <col />
                <col />
                <col className="hidden md:table-column" />
                {showProfitColumn && <col className="hidden md:table-column" />}
                <col className="hidden md:table-column" />
                <col className="hidden md:table-column" />
                <col className="hidden md:table-column" />
                <col />
                <col className="hidden md:table-column" style={{ width: "2.75rem" }} />
              </colgroup>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="text-right text-xs font-medium text-slate-500 px-2" />
                  <TableHead className="text-right text-xs font-medium text-slate-500 px-2">תאריך</TableHead>
                  <TableHead className="orders-table-sticky-col sticky right-0 z-[12] bg-slate-50 text-right text-xs font-medium text-slate-500 px-2 shadow-[inset_1px_0_0_0_rgb(226_232_240)] md:static md:shadow-none">שם לקוח</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500 px-2">
                    <span className="md:hidden">סכום</span>
                    <span className="hidden md:inline">סה"כ</span>
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-right text-xs font-medium text-slate-500 px-2">יתרה</TableHead>
                  {showProfitColumn && (
                    <TableHead className="hidden md:table-cell text-right text-xs font-medium text-slate-500 px-2">רווח</TableHead>
                  )}
                  <TableHead className="hidden md:table-cell text-right text-xs font-medium text-slate-500 px-2">סטטוס</TableHead>
                  <TableHead className="hidden md:table-cell text-center text-xs font-medium text-slate-500 px-2">תוכנית</TableHead>
                  <TableHead className="hidden md:table-cell text-center text-xs font-medium text-slate-500 px-2">משלוח</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500 px-2">
                    <span className="md:hidden">שיוך</span>
                    <span className="hidden md:inline">יצר/ה</span>
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-left text-xs font-medium text-slate-500 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((order) => {
                  const isExpanded = expandedRowId === order.rowId;
                  const isBusy = busyAction.rowId === order.rowId;
                  const isCancelled = order.displayStatus === "cancelled";
                  const isError = order.displayStatus === "error";
                  const latestTimelineEvent = order.timeline.length > 0
                    ? order.timeline[order.timeline.length - 1]
                    : null;
                  const latestTimelineText = formatTimelineEventSummary(latestTimelineEvent);
                  const latestTimelineDate = latestTimelineEvent?.date
                    ? moment(latestTimelineEvent.date).format("DD/MM/YY HH:mm")
                    : "";
                  // מודול 1: צביעת שורה לפי מצב תשלום/תאריך יעד (ר' resolveRowTone ב-dashboardOrders.js)
                  const rowToneClass = ROW_TONE_CLASSNAMES[order.rowTone] || "";
                  return (
                    <React.Fragment key={order.rowId}>
                      <TableRow
                        className={`orders-table-data-row group cursor-pointer transition-none md:transition-colors ${
                          rowToneClass || "hover:bg-transparent md:hover:bg-slate-50/70"
                        }`}
                        onClick={() => setExpandedRowId(isExpanded ? null : order.rowId)}
                      >
                        <TableCell className="text-center px-1 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(event) => event.stopPropagation()}
                                disabled={isError}
                                className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 opacity-100 transition-all hover:bg-slate-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <OrderActionsMenu
                              order={order}
                              align="start"
                              className="w-52"
                              isBusy={isBusy}
                              isCancelled={isCancelled}
                              isError={isError}
                              canResendWhatsapp={!!onResendWhatsapp}
                              onResendWhatsapp={() => setResendConfirmOrder(order)}
                              onCopyLink={() => handleCopyLink(order)}
                              onOpenOrder={() => order.publicOrderUrl && window.open(order.publicOrderUrl, "_blank", "noopener,noreferrer")}
                              canAssign={canViewOthers && employees.length > 0}
                              onAssign={() => openAssignDialog(order)}
                              canCompletePayment={isCompletablePaymentStatus(order) && !!onCompletePartialPayment}
                              onCompletePayment={() => openPartialPayDialog(order)}
                              canGenerateInvoices={canGenerateInvoices}
                              invoiceDocs={getOrderInvoiceDocs(order)}
                              onViewDoc={(doc) => doc.url && window.open(doc.url, "_blank", "noopener,noreferrer")}
                              onResendInvoiceDoc={(doc) => {
                                setResendInvoiceOrder(order);
                                setResendInvoiceDocId(doc.docId ?? null);
                                setResendInvoiceMethod("email");
                              }}
                              onGenerateInvoice={() => openInvoiceDialog(order)}
                              formatInvoiceDocLabel={formatInvoiceDocLabel}
                              canDelete={!!onDeleteOrder}
                              onDelete={() => setDeleteOrderState(order)}
                            />
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap px-1 py-2">
                          {order.sentDate ? moment(order.sentDate).format("DD/MM") : "—"}
                        </TableCell>
                        <TableCell className={`orders-table-sticky-col sticky right-0 z-[11] max-w-[min(140px,32vw)] px-2 py-2 text-xs font-medium text-slate-700 shadow-[inset_1px_0_0_0_rgb(226_232_240)] md:static md:max-w-none md:shadow-none ${
                          rowToneClass ? rowToneClass.split(" ")[0] : "bg-white md:group-hover:bg-slate-50"
                        }`}>
                          <span className="block truncate md:hidden">{formatShortName(order.customerName) || "—"}</span>
                          <span className="hidden truncate md:block">{order.customerName || "—"}</span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap px-1 py-2">
                          <div className="font-semibold text-slate-800 tabular-nums text-xs">
                            ₪{order.totalAmount.toLocaleString("he-IL")}
                          </div>
                          {isPaidDisplayStatus(order.displayStatus) && (() => { 
                            const actualPaid = resolveActualPaidAmount(order);
                            const total = Math.max(0, Number(order.totalAmount ?? 0));
                            if (!Number.isFinite(actualPaid) || actualPaid <= 0) return null;
                            if (Math.round(actualPaid) === Math.round(total)) return null;
                            return (
                              <div className="hidden md:block text-[10px] font-semibold text-emerald-900 tabular-nums">
                                ₪{actualPaid.toLocaleString("he-IL")}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right whitespace-nowrap px-1 py-2">
                          {renderRemainingAmountCell(order)}
                        </TableCell>
                        {showProfitColumn && (
                          <TableCell className="hidden md:table-cell text-right whitespace-nowrap px-1 py-2">
                            {isPaidDisplayStatus(order.displayStatus) ? (
                              <div>
                                <div className="text-xs font-semibold text-emerald-700">
                                  ₪{(order.profitAmount ?? 0).toLocaleString("he-IL")}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {order.profitPercent != null ? `${order.profitPercent}%` : "—"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="hidden md:table-cell px-2 py-2 overflow-hidden text-right">
                          <div className="flex items-center justify-start gap-1">
                            <Badge
                              variant="outline"
                              className={`inline-flex max-w-full truncate text-[10px] border-0 font-medium px-1.5 ${order.statusCfg.className}`}
                            >
                              <span className="truncate">{order.statusCfg.label}</span>
                            </Badge>
                            {canGenerateInvoices && renderInvoiceIndicator(order, { compact: true })}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell px-2 py-2">
                          <div className="flex justify-center">
                            <FulfillmentStatusIcon
                              status={order.planStatus}
                              tooltip={order.planStatus === "yes" ? order.planName : ""}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell px-2 py-2">
                          <div className="flex justify-center">
                            <FulfillmentStatusIcon
                              status={order.shippingStatus}
                              tooltip={order.shippingStatus === "yes" && order.deliveryNumber && order.deliveryNumber !== "—" ? order.deliveryNumber : ""}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-1 py-2 text-xs font-medium text-slate-700 truncate">
                          {formatCreatorFirstName(order.creatorName)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-left px-1 py-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedRowId(isExpanded ? null : order.rowId);
                            }}
                            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100"
                            aria-label={isExpanded ? "סגור פרטים" : "פתח פרטים"}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                          <TableCell colSpan={showProfitColumn ? 11 : 10} className="p-0">
                            <AnimatePresence initial={false}>
                              <motion.div
                                initial={{ opacity: 0, height: 0, y: -4, scale: 0.985 }}
                                animate={{ opacity: 1, height: "auto", y: 0, scale: 1 }}
                                exit={{ opacity: 0, height: 0, y: -4, scale: 0.985 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className="overflow-hidden"
                              >
                                <div className="p-2 md:p-4 max-w-[100vw] md:max-w-none" style={{boxSizing:'border-box'}}>
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 md:p-4 space-y-3 w-full box-border" dir="rtl">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-slate-800">{order.customerName || "ללא שם"}</p>
                                      <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-xs text-slate-400">
                                        <span>{order.orderNumber}</span>
                                        <span>•</span>
                                        <span>{order.sentDate ? moment(order.sentDate).format("DD/MM/YYYY HH:mm") : "—"}</span>
                                      </div>
                                    </div>
                                    <div className="hidden md:flex items-center justify-end">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={(event) => event.stopPropagation()}
                                            className="h-9 gap-1.5"
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                            פעולות נוספות
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <OrderActionsMenu
                                          order={order}
                                          align="end"
                                          className="w-56"
                                          isBusy={isBusy}
                                          isCancelled={isCancelled}
                                          isError={isError}
                                          canResendWhatsapp={!!onResendWhatsapp}
                                          onResendWhatsapp={() => setResendConfirmOrder(order)}
                                          onCopyLink={() => handleCopyLink(order)}
                                          onOpenOrder={() => order.publicOrderUrl && window.open(order.publicOrderUrl, "_blank", "noopener,noreferrer")}
                                          canAssign={canViewOthers && employees.length > 0}
                                          onAssign={() => openAssignDialog(order)}
                                          canCompletePayment={isCompletablePaymentStatus(order) && !!onCompletePartialPayment}
                                          onCompletePayment={() => openPartialPayDialog(order)}
                                          canGenerateInvoices={canGenerateInvoices}
                                          invoiceDocs={getOrderInvoiceDocs(order)}
                                          onViewDoc={(doc) => doc.url && window.open(doc.url, "_blank", "noopener,noreferrer")}
                                          onResendInvoiceDoc={(doc) => {
                                            setResendInvoiceOrder(order);
                                            setResendInvoiceDocId(doc.docId ?? null);
                                            setResendInvoiceMethod("email");
                                          }}
                                          onGenerateInvoice={() => openInvoiceDialog(order)}
                                          formatInvoiceDocLabel={formatInvoiceDocLabel}
                                          canDelete={!!onDeleteOrder}
                                          onDelete={() => setDeleteOrderState(order)}
                                        />
                                      </DropdownMenu>
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

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 w-full items-start">
                                    {isMobile ? (
                                      <div className="space-y-2 w-full min-w-0">
                                        <div className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2.5">
                                          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                            <UserRound className="w-3.5 h-3.5 text-slate-400" />
                                            פרטי לקוח ותשלום
                                          </div>
                                          <OrderCustomerDetails
                                            order={order}
                                            editingDueDateRowId={editingDueDateRowId}
                                            dueDateDraft={dueDateDraft}
                                            setDueDateDraft={setDueDateDraft}
                                            onOpenDueDateEditor={openDueDateEditor}
                                            onCloseDueDateEditor={closeDueDateEditor}
                                            onSaveDueDate={handleSaveDueDate}
                                            busyAction={busyAction}
                                            canEditDueDate={!!onUpdateDeposit}
                                            minDueDate={minDueDate}
                                          />
                                        </div>
                                        <div className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2.5">
                                          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                                            <span className="inline-flex items-center gap-1.5">
                                              <Package className="w-3.5 h-3.5 text-slate-400" />
                                              מוצרים
                                            </span>
                                            <span className="text-xs font-bold text-slate-800">
                                              סה"כ: {order.totalAmount.toLocaleString("he-IL")} ש"ח
                                            </span>
                                          </div>
                                          <OrderProductsList order={order} />
                                        </div>
                                      </div>
                                    ) : (
                                      <Accordion type="multiple" className="space-y-2 md:space-y-3 w-full min-w-0">
                                        <AccordionItem value={`${order.rowId}-customer`} className="w-full min-h-[56px] md:min-h-[72px] rounded-xl md:rounded-2xl border border-slate-200 bg-slate-50/70 px-2.5 md:px-3 border-b-0 overflow-hidden">
                                          <AccordionTrigger className="min-h-[56px] md:min-h-[72px] py-0 text-right hover:no-underline">
                                            <span className="flex w-full min-w-0 items-center justify-between gap-2 md:gap-3">
                                              <span className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold text-slate-700 shrink-0">
                                                <UserRound className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                                                פרטי לקוח ותשלום
                                              </span>
                                              <span className="min-w-0 flex-1" />
                                            </span>
                                          </AccordionTrigger>
                                          <AccordionContent className="pb-2 md:pb-3 pt-1">
                                            <OrderCustomerDetails
                                              order={order}
                                              editingDueDateRowId={editingDueDateRowId}
                                              dueDateDraft={dueDateDraft}
                                              setDueDateDraft={setDueDateDraft}
                                              onOpenDueDateEditor={openDueDateEditor}
                                              onCloseDueDateEditor={closeDueDateEditor}
                                              onSaveDueDate={handleSaveDueDate}
                                              busyAction={busyAction}
                                              canEditDueDate={!!onUpdateDeposit}
                                              minDueDate={minDueDate}
                                            />
                                          </AccordionContent>
                                        </AccordionItem>

                                        <AccordionItem value={`${order.rowId}-products`} className="w-full min-h-[56px] md:min-h-[72px] rounded-xl md:rounded-2xl border border-slate-200 bg-slate-50/70 px-2.5 md:px-3 border-b-0 overflow-hidden">
                                          <AccordionTrigger className="min-h-[56px] md:min-h-[72px] py-0 text-right hover:no-underline">
                                            <span className="flex w-full min-w-0 items-center justify-between gap-2 text-xs md:text-sm font-semibold text-slate-700">
                                              <span className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold text-slate-700 shrink-0">
                                                <Package className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                                                מוצרים
                                              </span>
                                              <span className="truncate text-xs md:text-sm font-bold text-slate-800 text-right">
                                                סה"כ: {order.totalAmount.toLocaleString("he-IL")} ש"ח
                                              </span>
                                            </span>
                                          </AccordionTrigger>
                                          <AccordionContent className="pb-3 pt-1">
                                            <OrderProductsList order={order} />
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                    )}

                                    <Accordion type="multiple" className="space-y-2 md:space-y-3 w-full min-w-0">
                                      <AccordionItem value={`${order.rowId}-timeline`} className="w-full min-h-[56px] md:min-h-[72px] rounded-xl md:rounded-2xl border border-slate-200 bg-slate-50/70 px-2.5 md:px-3 border-b-0 overflow-hidden">
                                        <AccordionTrigger className="min-h-[56px] md:min-h-[72px] py-0 text-right hover:no-underline">
                                          <span className="flex w-full min-w-0 items-center justify-between gap-2 md:gap-3">
                                            <span className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold text-slate-700 shrink-0">
                                              <Workflow className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                                              פעולות אחרונות
                                              {order.whatsappDeliveryStatus === "success" ? (
                                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="וואטסאפ נשלח" />
                                              ) : order.whatsappDeliveryStatus === "requested" ? (
                                                <RefreshCw className="w-3 h-3 text-sky-500" title="וואטסאפ ממתין" />
                                              ) : order.whatsappDeliveryStatus === "failed" ? (
                                                <CircleAlert className="w-3 h-3 text-red-500" title="וואטסאפ נכשל" />
                                              ) : null}
                                            </span>
                                            <span className="min-w-0 flex-1 text-right">
                                              {latestTimelineDate && (
                                                <span className="block truncate text-[10px] text-slate-400 leading-4">
                                                  {latestTimelineDate}
                                                </span>
                                              )}
                                              <span className="block truncate whitespace-nowrap text-[11px] md:text-xs text-slate-600">
                                                {latestTimelineText}
                                              </span>
                                            </span>
                                          </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-2 md:pb-3 pt-1">
                                          {order.timeline.length > 0 ? (
                                            <div className="space-y-2">
                                              {order.timeline.map((event, index) => {
                                                const action = event.action || event.type || "event";
                                                return (
                                                  <div key={`${order.rowId}-timeline-${index}`} className="flex items-start gap-2">
                                                    <div className="flex flex-col items-center shrink-0">
                                                      <div className={`h-2 w-2 rounded-full ${timelineDotClass(action)}`} />
                                                      {index < order.timeline.length - 1 && (
                                                        <div className="w-px min-h-[24px] bg-slate-200" />
                                                      )}
                                                    </div>
                                                    <div className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-right">
                                                      <div className="mb-0.5 flex items-center justify-between gap-2">
                                                        <span className="text-[10px] text-slate-400">
                                                          {event.date ? moment(event.date).format("DD/MM/YY HH:mm") : "—"}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                                                          {event.actorType === "employee" && event.by
                                                            ? `${getActorBadgeText(event)} · ${event.by}`
                                                            : getActorBadgeText(event)}
                                                        </Badge>
                                                      </div>
                                                      <p className="text-xs md:text-sm text-slate-700">
                                                        {formatTimelineEventSummary(event)}
                                                      </p>
                                                      {action === "created" && event.detail && (
                                                        <p className="mt-0.5 text-[10px] md:text-xs text-slate-400">{event.detail}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-slate-400 text-right">אין פעולות להצגה עבור הזמנה זו</p>
                                          )}
                                        </AccordionContent>
                                      </AccordionItem>

                                      <AccordionItem value={`${order.rowId}-add-note`} className="w-full min-h-[56px] md:min-h-[72px] rounded-xl md:rounded-2xl border border-slate-200 bg-slate-50/70 px-2.5 md:px-3 border-b-0 overflow-hidden">
                                        <AccordionTrigger className="min-h-[56px] md:min-h-[72px] py-0 text-right hover:no-underline">
                                          <span className="flex w-full min-w-0 items-center justify-between gap-2 md:gap-3">
                                            <span className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold text-slate-700 shrink-0">
                                              <MessageSquarePlus className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                                              הוספת הערה
                                            </span>
                                            <span className="min-w-0 flex-1" />
                                          </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-2 md:pb-3 pt-1">
                                          <div className="space-y-2">
                                            <Textarea
                                              value={noteDrafts[order.rowId] || ""}
                                              onChange={(event) =>
                                                setNoteDrafts((prev) => ({ ...prev, [order.rowId]: event.target.value }))
                                              }
                                              placeholder="כתבי הערה שתתווסף לתרשים הזרימה..."
                                              className="min-h-[64px] md:min-h-[76px] resize-none border-slate-200 bg-white text-right text-sm"
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
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
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

          {totalPages > 1 && (
            <div className="px-3 py-3 md:px-6 border-t border-slate-100 flex items-center justify-between" dir="rtl">
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

      <Dialog
        open={Boolean(resendConfirmOrder)}
        onOpenChange={(open) => !open && busyAction.type !== "resend" && setResendConfirmOrder(null)}
      >
        <DialogContent dir="rtl" className={TOP_DIALOG_CONTENT_CLASSNAME}>
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
        <DialogContent dir="rtl" className={TOP_DIALOG_CONTENT_CLASSNAME}>
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

      <Dialog
        open={Boolean(assignOrderState)}
        onOpenChange={(open) => {
          if (!open && busyAction.type !== "assign") {
            setAssignOrderState(null);
            setPendingAssignEmployeeId("");
          }
        }}
      >
        <DialogContent dir="rtl" className={TOP_DIALOG_CONTENT_CLASSNAME}>
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">שינוי שיוך הזמנה</DialogTitle>
            <DialogDescription className="text-right">
              בחר/י את העובד/ת שאליו/ה תשויך ההזמנה של {assignOrderState?.customerName || "הלקוח/ה"}.
              השינוי יתועד בפעולות אחרונות.
            </DialogDescription>
          </DialogHeader>
          <EmployeeAssignField
            employees={employees}
            value={pendingAssignEmployeeId}
            onChange={setPendingAssignEmployeeId}
            disabled={busyAction.type === "assign"}
            label="שיוך לעובד/ת"
          />
          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={handleConfirmAssign}
              disabled={busyAction.type === "assign" || !pendingAssignEmployeeId}
            >
              שמירת שיוך
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAssignOrderState(null);
                setPendingAssignEmployeeId("");
              }}
              disabled={busyAction.type === "assign"}
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(partialPayOrder)}
        onOpenChange={(open) => {
          if (!open && busyAction.type !== "partialPay") {
            setPartialPayOrder(null);
            setPartialPayError("");
          }
        }}
      >
        <DialogContent dir="rtl" className={TOP_DIALOG_CONTENT_CLASSNAME}>
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">השלמת תשלום</DialogTitle>
            <DialogDescription className="text-right">
              השלמת תשלום עבור הזמנה #{partialPayOrder?.orderNumber || ""} — {partialPayOrder?.customerName || ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <span className="text-sm text-amber-800 font-medium">יתרה לתשלום</span>
              <span className="text-lg font-bold text-amber-900">
                ₪{partialPayOrder ? resolveRemainingBalance(partialPayOrder).toLocaleString("he-IL") : 0}
              </span>
            </div>

            {partialPayOrder?.displayStatus === "awaiting_deposit" && (
              <p className="text-xs text-amber-800 text-right">
                יתרת המקדמה: ₪{resolveCompletePaymentDefault(partialPayOrder).toLocaleString("he-IL")}. השלמת מלוא המקדמה תשלח ללקוח/ה בוואטסאפ קישור עם פירוט ההזמנה, המקדמה והיתרה, והשלמת פרטים.
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 text-right">סכום ששולם</label>
              <Input
                type="number"
                min="0"
                max={partialPayOrder ? resolveRemainingBalance(partialPayOrder) : 0}
                step="0.01"
                value={partialPayAmount}
                onChange={(e) => { setPartialPayAmount(e.target.value); setPartialPayError(""); }}
                disabled={busyAction.type === "partialPay"}
                className="text-right"
                placeholder="₪"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 text-right">אופן תשלום</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPartialPayMethod(method);
                      setPartialPayError("");
                    }}
                    disabled={busyAction.type === "partialPay"}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      partialPayMethod === method
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 text-right">הערות</label>
              <Textarea
                value={partialPayNotes}
                onChange={(e) => setPartialPayNotes(e.target.value)}
                disabled={busyAction.type === "partialPay"}
                rows={2}
                className="text-right"
                placeholder="הערות נוספות (אופציונלי)"
              />
            </div>

            {partialPayError && (
              <p className="text-sm text-red-600 text-right">{partialPayError}</p>
            )}
          </div>

          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={handleConfirmPartialPay}
              disabled={busyAction.type === "partialPay"}
            >
              {busyAction.type === "partialPay" ? "שומר..." : "שמירת תשלום"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setPartialPayOrder(null); setPartialPayError(""); }}
              disabled={busyAction.type === "partialPay"}
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpaid order warning before invoice generation */}
      <Dialog
        open={Boolean(invoiceUnpaidWarningOrder)}
        onOpenChange={(open) => !open && setInvoiceUnpaidWarningOrder(null)}
      >
        <DialogContent dir="rtl" className={TOP_DIALOG_CONTENT_CLASSNAME}>
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">הזמנה שטרם שולמה</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              ההזמנה של {invoiceUnpaidWarningOrder?.customerName || "הלקוח/ה"} נמצאת בסטטוס{" "}
              <span className="font-semibold text-slate-900">
                {STATUS_CONFIG[invoiceUnpaidWarningOrder?.displayStatus]?.label || invoiceUnpaidWarningOrder?.displayStatus || "לא ידוע"}
              </span>
              {" "}ולא בסטטוס שולם.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-right">
            הפקת חשבונית להזמנה שלא שולמה עלולה ליצור אי-התאמה בין החיוב לבין סטטוס ההזמנה. האם להמשיך?
          </div>
          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleConfirmUnpaidInvoice}
            >
              המשך להפקת חשבונית
            </Button>
            <Button type="button" variant="ghost" onClick={() => setInvoiceUnpaidWarningOrder(null)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog
        open={Boolean(invoiceOrder)}
        onOpenChange={(open) => !open && busyAction.type !== "invoice" && setInvoiceOrder(null)}
      >
        <DialogContent dir="rtl" className={TOP_DIALOG_CONTENT_CLASSNAME}>
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">הפקת חשבונית</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              הפקת חשבונית עבור ההזמנה של {invoiceOrder?.customerName || "הלקוח/ה"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors" dir="rtl">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                invoiceSendByEmail ? "bg-slate-900 border-slate-900" : "border-slate-300"
              }`}>
                {invoiceSendByEmail && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </div>
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700">שליחה במייל</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={invoiceSendByEmail}
                onChange={(e) => setInvoiceSendByEmail(e.target.checked)}
              />
            </label>
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors" dir="rtl">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                invoiceSendBySMS ? "bg-slate-900 border-slate-900" : "border-slate-300"
              }`}>
                {invoiceSendBySMS && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </div>
              <Smartphone className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700">שליחה ב-SMS</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={invoiceSendBySMS}
                onChange={(e) => setInvoiceSendBySMS(e.target.checked)}
              />
            </label>
          </div>
          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={() => handleConfirmGenerateInvoice(false)}
              disabled={busyAction.type === "invoice"}
            >
              {busyAction.type === "invoice" ? "מפיק..." : "הפקת חשבונית"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setInvoiceOrder(null)} disabled={busyAction.type === "invoice"}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Invoice Warning Dialog */}
      <Dialog
        open={Boolean(invoiceDuplicateOrder)}
        onOpenChange={(open) => !open && busyAction.type !== "invoice" && setInvoiceDuplicateOrder(null)}
      >
        <DialogContent dir="rtl" className={TOP_DIALOG_CONTENT_CLASSNAME}>
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">חשבונית קיימת</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              כבר קיימת חשבונית עבור ההזמנה של {invoiceDuplicateOrder?.customerName || "הלקוח/ה"}.
              האם להפיק חשבונית נוספת?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-right">
            שימי לב: הפקת חשבונית נוספת תיצור מסמך חדש מבלי לבטל את הקיים. ודאי שזו הפעולה הנכונה.
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors" dir="rtl">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                invoiceSendByEmail ? "bg-slate-900 border-slate-900" : "border-slate-300"
              }`}>
                {invoiceSendByEmail && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </div>
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700">שליחה במייל</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={invoiceSendByEmail}
                onChange={(e) => setInvoiceSendByEmail(e.target.checked)}
              />
            </label>
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors" dir="rtl">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                invoiceSendBySMS ? "bg-slate-900 border-slate-900" : "border-slate-300"
              }`}>
                {invoiceSendBySMS && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </div>
              <Smartphone className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700">שליחה ב-SMS</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={invoiceSendBySMS}
                onChange={(e) => setInvoiceSendBySMS(e.target.checked)}
              />
            </label>
          </div>
          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => handleConfirmGenerateInvoice(true)}
              disabled={busyAction.type === "invoice"}
            >
              {busyAction.type === "invoice" ? "מפיק..." : "כן, להפיק חשבונית נוספת"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setInvoiceDuplicateOrder(null)} disabled={busyAction.type === "invoice"}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Invoice Dialog */}
      <Dialog
        open={Boolean(resendInvoiceOrder)}
        onOpenChange={(open) => {
          if (!open && busyAction.type !== "resendInvoice") {
            setResendInvoiceOrder(null);
            setResendInvoiceDocId(null);
          }
        }}
      >
        <DialogContent dir="rtl" className={TOP_DIALOG_CONTENT_CLASSNAME}>
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">שליחה חוזרת של חשבונית</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              {(() => {
                const docs = resendInvoiceOrder ? getOrderInvoiceDocs(resendInvoiceOrder) : [];
                const targetDoc = (resendInvoiceDocId != null
                  ? docs.find((d) => String(d.docId) === String(resendInvoiceDocId))
                  : null) || docs[docs.length - 1];
                const docLabel = targetDoc ? `(${formatInvoiceDocLabel(targetDoc)}) ` : "";
                return `בחרי את אמצעי המשלוח לשליחה חוזרת של החשבונית ${docLabel}עבור ${resendInvoiceOrder?.customerName || "הלקוח/ה"}.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setResendInvoiceMethod("email")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                resendInvoiceMethod === "email"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              <Mail className="w-4 h-4" />
              מייל
            </button>
            <button
              type="button"
              onClick={() => setResendInvoiceMethod("sms")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                resendInvoiceMethod === "sms"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              SMS
            </button>
          </div>
          <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
            <Button
              type="button"
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={handleConfirmResendInvoice}
              disabled={busyAction.type === "resendInvoice"}
            >
              {busyAction.type === "resendInvoice" ? "שולח..." : "שליחה חוזרת"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setResendInvoiceOrder(null)} disabled={busyAction.type === "resendInvoice"}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
