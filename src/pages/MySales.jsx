import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, ShoppingBag, CreditCard, Users } from "lucide-react";
import moment from "moment";
import DateRangePicker from "../components/dashboard/DateRangePicker";
import OrdersTable from "../components/dashboard/OrdersTable";
import { useAuth } from "@/lib/IframeAuthContext";
import { usePostMessage } from "@/hooks/usePostMessage";
import { toast } from "sonner";
import {
  isPaidDisplayStatus,
  normalizeOrder,
  SALES_STATUS_FILTERS,
  STATUS_CONFIG,
} from "@/utils/dashboardOrders";

const DEMO_USER_NAME = "שרה מ.";

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
  const { user, canViewOthers, commissionRate, isLoading: isAuthLoading } = useAuth();
  const { request } = usePostMessage();

  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  const isDemo = !user;

  const loadOrders = useCallback(async () => {
    if (isAuthLoading) return;

    setIsLoadingOrders(true);
    if (isDemo) {
      const demoOrders = DEMO_ORDERS.filter((order) =>
        order.timeline.some((event) => event.by === DEMO_USER_NAME && event.type === "created")
      );
      setOrders(demoOrders);
      setIsLoadingOrders(false);
      return;
    }

    try {
      const result = await request("GET_ORDERS");
      setOrders(result.orders || []);
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

  const filteredOrders = useMemo(() => {
    return normalizedOrders.filter((order) => {
      const relevantDate = moment(order.orderDate || order.sentDate || undefined);
      const matchesDate =
        (!dateRange.from || relevantDate.isSameOrAfter(moment(dateRange.from).startOf("day"))) &&
        (!dateRange.to || relevantDate.isSameOrBefore(moment(dateRange.to).endOf("day")));
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(order.displayStatus);
      return matchesDate && matchesStatus;
    });
  }, [normalizedOrders, dateRange, selectedStatuses]);

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
      toast.success("(מצב דמו) הקישור נשלח שוב לוואטסאפ");
      return;
    }

    try {
      await request("RESEND_ORDER_WHATSAPP", { recordId: orderId });
      toast.success("הקישור נשלח שוב ללקוח בוואטסאפ");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בשליחה חוזרת לוואטסאפ");
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    if (isDemo) {
      setOrders((prev) => prev.map((order) =>
        (order.id === orderId || order._id === orderId) ? { ...order, status } : order
      ));
      toast.success("(מצב דמו) סטטוס ההזמנה עודכן");
      return;
    }

    try {
      await request("UPDATE_ORDER_STATUS", { recordId: orderId, status });
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

  const activeFilterCount = (dateRange.from || dateRange.to ? 1 : 0) + selectedStatuses.length;

  return (
    <div className="min-h-screen bg-[#f8f8f8] p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6 relative">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-200 text-slate-500">
              {canViewOthers ? "צפייה: כל ההזמנות" : "צפייה: ההזמנות שלי"}
            </Badge>
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
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 space-y-4 overflow-visible"
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
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "הכנסות", value: `₪${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
            { label: "הזמנות", value: filteredOrders.length, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
            { label: "שולמו", value: paidCount, icon: CreditCard, color: "text-violet-600 bg-violet-50" },
            { label: "ממוצע להזמנה", value: `₪${avgOrder.toLocaleString()}`, icon: Users, color: "text-amber-600 bg-amber-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800">{value}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        <OrdersTable
          orders={filteredOrders}
          isLoading={isLoadingOrders || isAuthLoading}
          onCopyToClipboard={handleCopyToClipboard}
          onResendWhatsapp={handleResendWhatsapp}
          onUpdateStatus={handleUpdateOrderStatus}
          onDeleteOrder={handleDeleteOrder}
          onAddNote={handleAddNote}
          showProfitColumn
          commissionRate={commissionRate ?? 0}
        />
      </div>
    </div>
  );
}