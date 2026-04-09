import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, ShoppingBag, CreditCard, Percent, Users, ChevronDown, Loader2 } from "lucide-react";
import moment from "moment";
import DateRangePicker from "../components/dashboard/DateRangePicker";
import { useAuth } from "@/lib/IframeAuthContext";
import { usePostMessage } from "@/hooks/usePostMessage";
import { toast } from "sonner";
import { normalizeOrder, isPaidDisplayStatus } from "@/utils/dashboardOrders";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DEMO_USER_NAME = "שרה מ.";
const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"];

/** מקרא מתחת לעוגה — בלי תוויות על הפרוסות (מונע חפיפה וחיתוך) */
function PaymentStatusLegend({ payload }) {
  if (!payload?.length) return null;
  const total = payload.reduce((sum, entry) => sum + (Number(entry?.payload?.value) || 0), 0);
  return (
    <div
      className="flex flex-wrap justify-center gap-x-8 gap-y-2 pt-2 text-sm text-slate-700"
      dir="rtl"
    >
      {payload.map((entry) => {
        const val = Number(entry?.payload?.value) || 0;
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        const label = entry?.value ?? "";
        return (
          <span key={`${label}-${entry?.color}`} className="inline-flex items-center gap-2 max-w-full">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-sm border border-slate-200/80"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-right leading-snug">
              <span className="font-medium">{label}</span>
              <span className="text-slate-500 mr-1 tabular-nums">
                {pct}% · {val} הזמנות
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

function creatorKey(order) {
  const ref = order.createdByRef != null && String(order.createdByRef).trim() !== ""
    ? String(order.createdByRef).trim()
    : "";
  const name = String(order.creatorName || "").trim();
  return ref || name || "__none__";
}

function creatorLabel(order) {
  const name = String(order.creatorName || "").trim();
  return name || "לא ידוע";
}

export default function Statistics() {
  const { user, canViewOthers, commissionRate, isLoading: isAuthLoading } = useAuth();
  const { request } = usePostMessage();

  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  /** כש־canViewOthers: true = כל העובדים; false = רק הנבחרות ב־selectedCreatorKeys */
  const [includeAllCreators, setIncludeAllCreators] = useState(true);
  const [selectedCreatorKeys, setSelectedCreatorKeys] = useState(() => new Set());

  const isDemo = !user;

  const loadOrders = useCallback(async () => {
    if (isAuthLoading) return;

    setIsLoadingOrders(true);
    if (isDemo) {
      const demo = DEMO_ORDERS.filter((order) =>
        order.timeline?.some((event) => event.by === DEMO_USER_NAME && event.type === "created")
      );
      setOrders(demo);
      setIsLoadingOrders(false);
      return;
    }

    try {
      const result = await request("GET_ORDERS");
      setOrders(result.orders || []);
    } catch (err) {
      console.error("[Statistics] Failed to load orders:", err);
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

  const creatorOptions = useMemo(() => {
    const map = new Map();
    normalizedOrders.forEach((order) => {
      const key = creatorKey(order);
      if (!map.has(key)) {
        map.set(key, creatorLabel(order));
      }
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "he"));
  }, [normalizedOrders]);

  /** אתחול רשימת נבחרות כשטוענים הזמנות (רק אם עדיין ריק, כדי לא לדרוס בחירה ידנית) */
  useEffect(() => {
    if (!canViewOthers || creatorOptions.length === 0) return;
    setSelectedCreatorKeys((prev) => {
      if (prev.size > 0) return prev;
      return new Set(creatorOptions.map((c) => c.id));
    });
  }, [canViewOthers, creatorOptions]);

  const dateFiltered = useMemo(() => {
    return normalizedOrders.filter((order) => {
      const relevantDate = moment(order.orderDate || order.sentDate || undefined);
      if (!relevantDate.isValid()) return false;
      const matchFrom = !dateRange.from || relevantDate.isSameOrAfter(moment(dateRange.from).startOf("day"));
      const matchTo = !dateRange.to || relevantDate.isSameOrBefore(moment(dateRange.to).endOf("day"));
      return matchFrom && matchTo;
    });
  }, [normalizedOrders, dateRange]);

  const filteredOrders = useMemo(() => {
    if (!canViewOthers || includeAllCreators) {
      return dateFiltered;
    }
    return dateFiltered.filter((order) => selectedCreatorKeys.has(creatorKey(order)));
  }, [dateFiltered, canViewOthers, includeAllCreators, selectedCreatorKeys]);

  const paidOrders = useMemo(
    () => filteredOrders.filter((o) => isPaidDisplayStatus(o.displayStatus)),
    [filteredOrders]
  );

  const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0);
  const paidCount = paidOrders.length;
  const conversionRate = filteredOrders.length
    ? Math.round((paidCount / filteredOrders.length) * 100)
    : 0;

  const byDay = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      const day = moment(o.orderDate || o.sentDate).format("DD/MM");
      if (!map[day]) map[day] = { day, revenue: 0, orders: 0 };
      if (isPaidDisplayStatus(o.displayStatus)) {
        map[day].revenue += o.totalAmount;
      }
      map[day].orders += 1;
    });
    return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredOrders]);

  const productStats = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      (o.products || []).forEach((p) => {
        const name = p.name || "מוצר";
        if (!map[name]) map[name] = { name, value: 0 };
        map[name].value += Number(p.quantity || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredOrders]);

  const unpaidCount = Math.max(0, filteredOrders.length - paidCount);
  const paymentPie = [
    { name: "שולם", value: paidCount },
    { name: "לא שולם", value: unpaidCount },
  ];

  const isLoading = isLoadingOrders || isAuthLoading;

  const toggleCreator = (id, checked) => {
    setSelectedCreatorKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAllCreatorsInList = () => {
    const all = new Set(creatorOptions.map((c) => c.id));
    setSelectedCreatorKeys(all);
  };

  const employeeFilterSummary = () => {
    if (!canViewOthers) return null;
    if (includeAllCreators) return "כל העובדים";
    const n = selectedCreatorKeys.size;
    if (n === 0) return "לא נבחרו עובדים";
    if (n === creatorOptions.length) return "כל העובדים (נבחר)";
    if (n === 1) {
      const id = [...selectedCreatorKeys][0];
      const opt = creatorOptions.find((c) => c.id === id);
      return opt?.label || "עובדת אחת";
    }
    return `${n} עובדות נבחרו`;
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-xl font-bold text-slate-900">סטטיסטיקות</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {isDemo
                ? "מצב דמו"
                : canViewOthers
                  ? "נתונים לפי טווח תאריכים (ניתן לסנן לפי עובדת)"
                  : "סקירת ביצועי המכירות שלך"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canViewOthers && creatorOptions.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border-slate-200 gap-2 min-w-[200px] justify-between"
                    disabled={isLoading}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Users className="w-4 h-4 shrink-0 text-slate-500" />
                      <span className="truncate text-sm">{employeeFilterSummary()}</span>
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start" dir="rtl">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 space-x-reverse">
                      <Checkbox
                        id="stats-all-creators"
                        checked={includeAllCreators}
                        onCheckedChange={(v) => {
                          const checked = v === true;
                          setIncludeAllCreators(checked);
                          if (checked) selectAllCreatorsInList();
                        }}
                      />
                      <Label htmlFor="stats-all-creators" className="text-sm font-medium cursor-pointer">
                        כל העובדים
                      </Label>
                    </div>
                    <div className="border-t border-slate-100 pt-2 space-y-2 max-h-56 overflow-y-auto">
                      {creatorOptions.map(({ id, label }) => (
                        <div key={id} className="flex items-center gap-2 space-x-reverse">
                          <Checkbox
                            id={`creator-${id}`}
                            checked={selectedCreatorKeys.has(id)}
                            disabled={includeAllCreators}
                            onCheckedChange={(v) => toggleCreator(id, v === true)}
                          />
                          <Label
                            htmlFor={`creator-${id}`}
                            className={cn(
                              "text-sm cursor-pointer flex-1 truncate",
                              includeAllCreators && "text-slate-400 cursor-not-allowed"
                            )}
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {!includeAllCreators && selectedCreatorKeys.size === 0 && (
                      <p className="text-xs text-amber-700">נא לבחור לפחות עובדת אחת, או לסמן &quot;כל העובדים&quot;.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
            <p className="text-sm">טוען נתונים...</p>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                { label: "סה\"כ הכנסות (שולמו)", value: `₪${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
                { label: "הזמנות בתקופה", value: filteredOrders.length, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
                { label: "הזמנות ששולמו", value: paidCount, icon: CreditCard, color: "text-violet-600 bg-violet-50" },
                { label: "אחוז המרה", value: `${conversionRate}%`, icon: Percent, color: "text-amber-600 bg-amber-50" },
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5"
              >
                <h3 className="text-sm font-semibold text-slate-700 mb-4">הכנסות לפי יום (שולמו)</h3>
                {byDay.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">אין נתונים בטווח שנבחר</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byDay}>
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip formatter={(v) => [`₪${Number(v).toLocaleString()}`, "הכנסות"]} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5"
              >
                <h3 className="text-sm font-semibold text-slate-700 mb-4">סטטוס תשלומים</h3>
                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">אין נתונים בטווח שנבחר</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                      <Pie
                        data={paymentPie}
                        cx="50%"
                        cy="42%"
                        innerRadius={52}
                        outerRadius={76}
                        dataKey="value"
                        nameKey="name"
                        label={false}
                        paddingAngle={2}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} הזמנות`, name]}
                        contentStyle={{ direction: "rtl", textAlign: "right" }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        content={(props) => <PaymentStatusLegend {...props} />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 md:col-span-2"
              >
                <h3 className="text-sm font-semibold text-slate-700 mb-4">מוצרים מובילים (כמות)</h3>
                {productStats.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">אין נתונים בטווח שנבחר</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={productStats} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {productStats.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
