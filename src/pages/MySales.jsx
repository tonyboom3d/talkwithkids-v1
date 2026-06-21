import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, ShoppingBag, CreditCard, Users, FileText } from "lucide-react";
import moment from "moment";
import DateRangePicker from "../components/dashboard/DateRangePicker";
import OrdersTable from "../components/dashboard/OrdersTable";
import TransactionPickerDialog from "../components/dashboard/TransactionPickerDialog";
import EmployeeFilterField from "../components/dashboard/EmployeeFilterField";
import { useAuth } from "@/lib/IframeAuthContext";
import { usePostMessage } from "@/hooks/usePostMessage";
import { toast } from "sonner";
import {
  isPaidDisplayStatus,
  normalizeOrder,
  SALES_STATUS_FILTERS,
  STATUS_CONFIG,
} from "@/utils/dashboardOrders";
import { buildCreatorOptions, filterOrdersByCreators } from "@/utils/orderCreatorFilter";

const DEMO_USER_NAME = "שרה מ.";
const MY_SALES_REFRESH_KEY = "twk_my_sales_last_refresh";

function readSessionRefresh(key) {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(key) || "";
}

function saveSessionRefresh(key, value) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, value);
}

function exportToCSV(orders, canViewOthers) {
  const rows = [
    ["מספר הזמנה", "תאריך", "לקוח", "טלפון", "מוצרים", "סה\"כ", "סטטוס", "יוצר/ת", "רווח עמלה (₪)", "אחוז עמלה"],
    ...orders.map(o => [
      o.orderNumber,
      moment(o.orderDate || o.sentDate).format("DD/MM/YYYY HH:mm"),
      o.customerName,
      o.customerPhone || "",
      o.products.map(p => `${p.name} x${p.quantity}`).join(" | "),
      `₪${o.totalAmount.toLocaleString("he-IL")}`,
      o.statusCfg?.label || "",
      canViewOthers ? o.creatorName : "",
      isPaidDisplayStatus(o.displayStatus) ? `₪${(o.profitAmount ?? 0).toLocaleString("he-IL")}` : "",
      isPaidDisplayStatus(o.displayStatus) && o.profitPercent != null ? `${o.profitPercent}%` : "",
    ])
  ];
  const csv = "\uFEFF" + rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `המכירות_שלי_${moment().format("DD-MM-YYYY")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MySales() {
  const { user, canViewOthers, canGenerateInvoices, commissionRate, isLoading: isAuthLoading } = useAuth();
  const { request } = usePostMessage();

  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => readSessionRefresh(MY_SALES_REFRESH_KEY));
  const [includeAllCreators, setIncludeAllCreators] = useState(true);
  const [selectedCreatorKeys, setSelectedCreatorKeys] = useState(() => new Set());
  const [showTransactionPicker, setShowTransactionPicker] = useState(false);

  const isDemo = !user;

  const loadOrders = useCallback(async () => {
    if (isAuthLoading) return;

    setIsLoadingOrders(true);
    if (isDemo) {
      const demoOrders = DEMO_ORDERS.filter((order) =>
        order.timeline.some((event) => event.by === DEMO_USER_NAME && event.type === "created")
      );
      setOrders(demoOrders);
      const nowIso = new Date().toISOString();
      setLastRefreshedAt(nowIso);
      saveSessionRefresh(MY_SALES_REFRESH_KEY, nowIso);
      setIsLoadingOrders(false);
      return;
    }

    try {
      const result = await request("GET_ORDERS");
      setOrders(result.orders || []);
      const nowIso = new Date().toISOString();
      setLastRefreshedAt(nowIso);
      saveSessionRefresh(MY_SALES_REFRESH_KEY, nowIso);
    } catch (err) {
      console.error("[MySales] Failed to load orders:", err);
      toast.error("שגיאה בטעינת ההזמנות");
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isAuthLoading, isDemo, request]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const normalizedOrders = useMemo(
    () => (orders || []).map((order) => normalizeOrder(order, { commissionRate: commissionRate ?? 0 })),
    [orders, commissionRate]
  );

  const creatorOptions = useMemo(
    () => (canViewOthers ? buildCreatorOptions(orders) : []),
    [canViewOthers, orders]
  );

  useEffect(() => {
    if (!canViewOthers || creatorOptions.length === 0) return;
    setSelectedCreatorKeys((prev) => {
      if (prev.size > 0) return prev;
      return new Set(creatorOptions.map((creator) => creator.id));
    });
  }, [canViewOthers, creatorOptions]);

  const filteredOrders = useMemo(() => {
    const dateAndStatusFiltered = normalizedOrders.filter((order) => {
      const relevantDate = moment(order.orderDate || order.sentDate || undefined);
      const matchesDate =
        (!dateRange.from || relevantDate.isSameOrAfter(moment(dateRange.from).startOf("day"))) &&
        (!dateRange.to || relevantDate.isSameOrBefore(moment(dateRange.to).endOf("day")));
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(order.displayStatus);
      return matchesDate && matchesStatus;
    });

    return filterOrdersByCreators(
      dateAndStatusFiltered,
      canViewOthers,
      includeAllCreators,
      selectedCreatorKeys,
      user
    );
  }, [normalizedOrders, dateRange, selectedStatuses, canViewOthers, includeAllCreators, selectedCreatorKeys, user]);

  const paidOrders = useMemo(
    () => filteredOrders.filter((order) => isPaidDisplayStatus(order.displayStatus)),
    [filteredOrders]
  );

  const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const paidCount = paidOrders.length;
  const avgOrder = paidCount ? Math.round(totalRevenue / paidCount) : 0;
  const toggleStatusFilter = (statusKey) => {
    setSelectedStatuses((current) =>
      current.includes(statusKey)
        ? current.filter((item) => item !== statusKey)
        : [...current, statusKey]
    );
  };

  const clearFilters = () => {
    setDateRange({ from: null, to: null });
    setSelectedStatuses([]);
  };

  const handleAddNote = async (orderId, noteText) => {
    if (isDemo) {
      const nowIso = new Date().toISOString();
      setOrders((prev) => prev.map((order) => {
        if ((order.id || order._id) !== orderId) return order;
        const nextTimeline = [...(order.timeline || []), {
          type: "note",
          text: `נוספה הערה: ${noteText}`,
          by: user?.displayName || DEMO_USER_NAME,
          actorType: "employee",
          date: nowIso,
        }];
        const nextOrderNotes = [...(order.orderNotes || []), {
          id: `demo-note-${Date.now()}`,
          text: noteText,
          by: user?.displayName || DEMO_USER_NAME,
          date: nowIso,
        }];
        return {
          ...order,
          timeline: nextTimeline,
          orderNotes: nextOrderNotes,
        };
      }));
      toast.success("(מצב דמו) הערה נוספה");
      return;
    }

    try {
      await request("ADD_ORDER_NOTE", { recordId: orderId, note: noteText });
      toast.success("הערה נוספה בהצלחה");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בהוספת הערה");
    }
  };

  const handleResendWhatsapp = async (orderId) => {
    if (isDemo) {
      toast.success("(מצב דמו) בקשת השליחה החוזרת נשלחה");
      return;
    }

    try {
      await request("RESEND_ORDER_WHATSAPP", { recordId: orderId });
      toast.success("הודעת הוואטסאפ נשלחה מחדש. יש לרענן לקבל עדכון סטטוס.");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בשליחה חוזרת לוואטסאפ");
    }
  };

  const handleUpdateOrderStatus = async (orderId, status, options = {}) => {
    if (isDemo) {
      setOrders((prev) => prev.map((order) => {
        if (order.id !== orderId && order._id !== orderId) return order;
        if (status !== "paid_partial") {
          return { ...order, status };
        }
        const subtotal = Math.max(0, Number(order.totalPrice ?? order.total ?? 0) || 0);
        const paidAmount = Number(options.partialPayment?.amountPaid || 0);
        return {
          ...order,
          status,
          paymentMethod: options.paymentTag || "",
          partialPaidAmount: paidAmount,
          couponDetails: JSON.stringify({
            source: "partial_paid",
            type: "fixed",
            value: paidAmount,
            paidAmount,
            remainingAmount: Math.max(0, subtotal - paidAmount),
          }),
        };
      }));
      toast.success("(מצב דמו) סטטוס ההזמנה עודכן");
      return;
    }

    try {
      await request("UPDATE_ORDER_STATUS", { recordId: orderId, status, ...options });
      toast.success("סטטוס ההזמנה עודכן");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בעדכון סטטוס");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (isDemo) {
      setOrders((prev) => prev.map((order) =>
        (order.id === orderId || order._id === orderId) ? { ...order, status: "cancelled" } : order
      ));
      toast.success("(מצב דמו) ההזמנה בוטלה");
      return;
    }

    try {
      await request("DELETE_ORDER", { recordId: orderId });
      toast.success("ההזמנה בוטלה");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בביטול ההזמנה");
    }
  };

  const handleCopyToClipboard = async (text) => {
    if (!text) {
      toast.error("אין תוכן להעתקה");
      return;
    }

    if (isDemo) {
      await navigator.clipboard.writeText(text);
      toast.success("(מצב דמו) התוכן הועתק");
      return;
    }

    try {
      await request("COPY_TO_CLIPBOARD", { text });
      toast.success("הקישור הועתק");
    } catch (err) {
      toast.error(err.message || "שגיאה בהעתקת התוכן");
    }
  };

  const handleGenerateInvoice = async (orderId, { isSendByEmail, isSendSMS, force } = {}) => {
    if (isDemo) {
      toast.success("(מצב דמו) חשבונית הופקה");
      return { alreadyExists: false };
    }
    try {
      const result = await request("GENERATE_INVOICE", {
        recordId: orderId,
        isSendByEmail: !!isSendByEmail,
        isSendSMS: !!isSendSMS,
        force: !!force,
      });
      if (result.alreadyExists) {
        return result;
      }
      toast.success("חשבונית הופקה בהצלחה");
      loadOrders();
      return result;
    } catch (err) {
      toast.error(err.message || "שגיאה בהפקת חשבונית");
      throw err;
    }
  };

  const handleResendInvoice = async (orderId, docId, method) => {
    if (isDemo) {
      toast.success("(מצב דמו) חשבונית נשלחה מחדש");
      return;
    }
    try {
      await request("RESEND_INVOICE", { recordId: orderId, docId, method });
      toast.success("החשבונית נשלחה מחדש בהצלחה");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בשליחה חוזרת של חשבונית");
    }
  };

  const handleCreateInvoiceFromTransaction = async (dealId, opts) => {
    if (isDemo) {
      toast.success("(מצב דמו) חשבונית הופקה מעסקה");
      return { alreadyExists: false };
    }
    try {
      const result = await request("CREATE_INVOICE_FROM_TRANSACTION", {
        dealId,
        isSendByEmail: !!opts?.isSendByEmail,
        isSendSMS: !!opts?.isSendSMS,
        force: !!opts?.force,
      });
      if (result.alreadyExists) return result;
      const linkedMsg = result.linkedOrderNumber
        ? ` (קושרה להזמנה ${result.linkedOrderNumber})`
        : "";
      toast.success(`חשבונית הופקה בהצלחה${linkedMsg}`);
      loadOrders();
      return result;
    } catch (err) {
      toast.error(err.message || "שגיאה בהפקת חשבונית מעסקה");
      throw err;
    }
  };

  const activeFilterCount = (dateRange.from || dateRange.to ? 1 : 0) + selectedStatuses.length;

  return (
    <div className="min-h-screen bg-[#f8f8f8] p-3 md:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 relative">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">המכירות שלי</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {isDemo
                ? "מצב דמו להצגת מבנה המכירות"
                : canViewOthers
                  ? "מוצגות כל ההזמנות במערכת לפי הרשאת הצפייה שלך"
                  : "מוצגות רק ההזמנות שנוצרו על ידך"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-slate-200 text-slate-500">
              {canViewOthers ? "צפייה: כל ההזמנות" : "צפייה: ההזמנות שלי"}
            </Badge>
            {canGenerateInvoices && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs font-medium"
                onClick={() => setShowTransactionPicker(true)}
              >
                <FileText className="w-4 h-4" />
                הפקת חשבונית
              </Button>
            )}
            <Button
              onClick={() => exportToCSV(filteredOrders, canViewOthers)}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-9"
              disabled={filteredOrders.length === 0}
            >
              <Download className="w-4 h-4" />
              ייצוא לאקסל
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-3 md:p-4 space-y-4 overflow-visible"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-right">
              <h3 className="text-sm font-semibold text-slate-800">סינון הזמנות</h3>
              <p className="text-xs text-slate-400 mt-1">
                סנני לפי טווח תאריכים וסטטוסים. החיפוש המלא זמין גם בתוך הטבלה.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                className="h-9 border-slate-200"
              >
                ניקוי סינון
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SALES_STATUS_FILTERS.map((statusKey) => {
              const config = STATUS_CONFIG[statusKey];
              const isActive = selectedStatuses.includes(statusKey);
              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => toggleStatusFilter(statusKey)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: "הכנסות", value: `₪${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
            { label: "הזמנות", value: filteredOrders.length, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
            { label: "שולמו", value: paidCount, icon: CreditCard, color: "text-violet-600 bg-violet-50" },
            { label: "ממוצע להזמנה", value: `₪${avgOrder.toLocaleString()}`, icon: Users, color: "text-amber-600 bg-amber-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-3 md:p-4 flex items-center gap-3 md:gap-4">
              <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-base md:text-lg font-bold text-slate-800 truncate">{value}</div>
                <div className="text-xs text-slate-400 truncate">{label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {canViewOthers && creatorOptions.length > 0 && (
          <EmployeeFilterField
            creatorOptions={creatorOptions}
            includeAllCreators={includeAllCreators}
            selectedCreatorKeys={selectedCreatorKeys}
            disabled={isLoadingOrders || isAuthLoading}
            onIncludeAllChange={(checked) => {
              setIncludeAllCreators(checked);
              if (checked) {
                setSelectedCreatorKeys(new Set(creatorOptions.map((creator) => creator.id)));
              }
            }}
            onToggleCreator={(creatorId, checked) => {
              setIncludeAllCreators(false);
              setSelectedCreatorKeys((prev) => {
                const next = new Set(prev);
                if (checked) next.add(creatorId);
                else next.delete(creatorId);
                return next;
              });
            }}
          />
        )}

        <OrdersTable
          orders={filteredOrders}
          isLoading={isLoadingOrders || isAuthLoading}
          onRefresh={loadOrders}
          lastRefreshedAt={lastRefreshedAt}
          onCopyToClipboard={handleCopyToClipboard}
          onResendWhatsapp={handleResendWhatsapp}
          onUpdateStatus={handleUpdateOrderStatus}
          onDeleteOrder={handleDeleteOrder}
          onAddNote={handleAddNote}
          showProfitColumn
          commissionRate={commissionRate ?? 0}
          canGenerateInvoices={canGenerateInvoices}
          onGenerateInvoice={handleGenerateInvoice}
          onResendInvoice={handleResendInvoice}
        />

        <TransactionPickerDialog
          open={showTransactionPicker}
          onClose={() => setShowTransactionPicker(false)}
          onCreateInvoice={handleCreateInvoiceFromTransaction}
          request={request}
        />
      </div>
    </div>
  );
}