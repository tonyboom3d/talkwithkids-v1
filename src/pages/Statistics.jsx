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
  ComposedChart,
  Line,
  Scatter,
  CartesianGrid,
} from "recharts";
import { TrendingUp, ShoppingBag, CreditCard, Percent, Loader2, CircleDot } from "lucide-react";
import moment from "moment";
import DateRangePicker from "../components/dashboard/DateRangePicker";
import EmployeeFilterField from "../components/dashboard/EmployeeFilterField";
import { useAuth } from "@/lib/IframeAuthContext";
import { usePostMessage } from "@/hooks/usePostMessage";
import { toast } from "sonner";
import { normalizeOrder, isPaidDisplayStatus } from "@/utils/dashboardOrders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildCreatorOptions, filterOrdersByCreators } from "@/utils/orderCreatorFilter";

const DEMO_USER_NAME = "שרה מ.";

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

/** סכום שורת מוצר (מחיר יחידה × כמות) — לחלוקת רווח עמלה יחסית */
function productLineSubtotal(p) {
  const q = Number(p.quantity || 1);
  const price = Number(p.price ?? 0);
  return Math.max(0, price * q);
}

/** מועד עדיף: אירוע תשלום בטיימליין; אחרת תאריכי הזמנה / יצירה */
function resolvePaidSaleMoment(order) {
  const timeline = order.timeline || [];
  const paidEv = timeline.find((e) => (e.action || e.type) === "paid");
  const raw =
    paidEv?.date ||
    order.orderDate ||
    order.sentDate ||
    order._createdDate ||
    order.date;
  const m = moment(raw);
  return m.isValid() ? m : moment.invalid();
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
    return buildCreatorOptions(normalizedOrders);
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
    return filterOrdersByCreators(
      dateFiltered,
      canViewOthers,
      includeAllCreators,
      selectedCreatorKeys
    );
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
      const prods = o.products || [];
      const orderProfit = isPaidDisplayStatus(o.displayStatus) ? Number(o.profitAmount || 0) : 0;
      const linesSum = prods.reduce((s, p) => s + productLineSubtotal(p), 0);

      prods.forEach((p) => {
        const name = String(p.name || "מוצר").trim() || "מוצר";
        const id = p.id != null && String(p.id).trim() !== "" ? String(p.id).trim() : "";
        const key = id ? `id:${id}` : `name:${name}`;
        const img = (p.image || p.imageUrl || "").trim();
        if (!map[key]) {
          map[key] = { key, name, image: img, value: 0, profitTotal: 0 };
        }
        map[key].value += Number(p.quantity || 1);
        if (!map[key].image && img) map[key].image = img;

        const line = productLineSubtotal(p);
        let allocated = 0;
        if (orderProfit !== 0) {
          if (linesSum > 0) {
            allocated = (line / linesSum) * orderProfit;
          } else if (prods.length > 0) {
            allocated = orderProfit / prods.length;
          }
        }
        map[key].profitTotal += allocated;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((row, index) => ({
        ...row,
        rank: index + 1,
        profitTotal: Math.round(row.profitTotal * 100) / 100,
      }));
  }, [filteredOrders]);

  /**
   * נקודה לכל הזמנה ששולמה: ציר X = מועד, ציר Y = סכום.
   * `x` — מועד להצגה (עם הפרדה קלה כשנקודות חולקות אותו timestamp — Recharts מתקשה ב-monotone על כפילויות).
   * `xActual` — המועד האמיתי לטולטיפ.
   */
  const salesScatterPoints = useMemo(() => {
    const raw = paidOrders
      .map((o) => {
        const m = resolvePaidSaleMoment(o);
        if (!m.isValid()) return null;
        return {
          xActual: m.valueOf(),
          y: o.totalAmount,
          orderNumber: o.orderNumber,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.xActual - b.xActual);

    const dupAt = new Map();
    return raw.map((p) => {
      const n = (dupAt.get(p.xActual) || 0) + 1;
      dupAt.set(p.xActual, n);
      const dupIdx = n - 1;
      const x = p.xActual + dupIdx * 9000;
      return { ...p, x };
    });
  }, [paidOrders]);

  const scatterTimeDomain = useMemo(() => {
    if (!salesScatterPoints.length) return undefined;
    const xs = salesScatterPoints.map((p) => p.x);
    const minT = Math.min(...xs);
    const maxT = Math.max(...xs);
    const span = maxT - minT;
    const pad = span > 0 ? Math.max(span * 0.08, 36e5 * 0.25) : 36e5 * 12;
    return [minT - pad, maxT + pad];
  }, [salesScatterPoints]);

  const scatterYDomain = useMemo(() => {
    if (!salesScatterPoints.length) return undefined;
    const ys = salesScatterPoints.map((p) => Number(p.y) || 0);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const span = maxY - minY;
    const pad = span > 0 ? Math.max(span * 0.06, maxY * 0.02) : Math.max(maxY * 0.08, 50);
    return [Math.max(0, minY - pad), maxY + pad];
  }, [salesScatterPoints]);

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
                transition={{ delay: 0.13 }}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 md:col-span-2"
              >
                <div className="flex items-start gap-2 mb-1">
                  <CircleDot className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">מועדי מכירות (הזמנות ששולמו)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      כל נקודה = הזמנה ששולמה; קו סגול מחבר לפי סדר כרונולוגי. ציר אופקי: מועד התשלום (או תאריך ההזמנה); ציר אנכי: סכום. הזמנות באותו מועד מפורקות מעט לצורך תצוגה.
                    </p>
                  </div>
                </div>
                {salesScatterPoints.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">אין הזמנות ששולמו בטווח שנבחר</p>
                ) : (
                  <div className="w-full min-h-[300px]" dir="ltr">
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={salesScatterPoints} margin={{ top: 8, right: 12, left: 8, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          domain={scatterTimeDomain}
                          scale="time"
                          tickFormatter={(v) => moment(v).format("DD/MM")}
                          minTickGap={28}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          height={40}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          domain={scatterYDomain}
                          tickFormatter={(v) => `₪${Number(v).toLocaleString("he-IL")}`}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          width={72}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: "4 4", stroke: "#c4b5fd" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const p =
                              payload.map((e) => e?.payload).find((row) => row?.orderNumber) ??
                              payload[0]?.payload ??
                              {};
                            const t = p.xActual != null ? moment(p.xActual) : moment(p.x);
                            return (
                              <div
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md text-right"
                                dir="rtl"
                              >
                                <div className="font-medium text-slate-800">{p.orderNumber}</div>
                                <div className="text-slate-500 mt-0.5">
                                  {t.isValid() ? t.format("DD/MM/YYYY HH:mm") : "—"}
                                </div>
                                <div className="text-emerald-700 font-semibold tabular-nums mt-1">
                                  ₪{Number(p.y).toLocaleString("he-IL")}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Line
                          type="linear"
                          dataKey="y"
                          stroke="#a78bfa"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls
                          name="קו מגמה"
                        />
                        <Scatter
                          name="מכירות"
                          dataKey="y"
                          fill="#7c3aed"
                          fillOpacity={0.9}
                          isAnimationActive={false}
                          r={5}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 md:col-span-2"
              >
                <div className="mb-3 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">מוצרים מובילים (כמות)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      עמודת רווח: סה״כ עמלה מההזמנות ששולמו, מחולק יחסית לפי סכום שורות המוצר בהזמנה
                    </p>
                  </div>
                  {canViewOthers && creatorOptions.length > 0 && (
                    <EmployeeFilterField
                      creatorOptions={creatorOptions}
                      includeAllCreators={includeAllCreators}
                      selectedCreatorKeys={selectedCreatorKeys}
                      disabled={isLoading}
                      onIncludeAllChange={(checked) => {
                        setIncludeAllCreators(checked);
                        if (checked) selectAllCreatorsInList();
                      }}
                      onToggleCreator={toggleCreator}
                    />
                  )}
                </div>
                {productStats.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">אין נתונים בטווח שנבחר</p>
                ) : (
                  <div dir="rtl" className="rounded-xl border border-slate-100 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                          <TableHead className="w-12 text-center text-slate-600 font-semibold">#</TableHead>
                          <TableHead className="w-16 text-center text-slate-600 font-semibold">תמונה</TableHead>
                          <TableHead className="text-right text-slate-600 font-semibold">מוצר</TableHead>
                          <TableHead className="w-28 text-left tabular-nums text-slate-600 font-semibold">כמות</TableHead>
                          <TableHead className="w-32 text-left tabular-nums text-slate-600 font-semibold">רווח (סה״כ)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productStats.map((row) => (
                          <TableRow key={row.key}>
                            <TableCell className="text-center tabular-nums text-slate-500 font-medium">
                              {row.rank}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.image ? (
                                <img
                                  src={row.image}
                                  alt=""
                                  className="w-11 h-11 rounded-lg object-cover border border-slate-100 mx-auto"
                                  loading="lazy"
                                />
                              ) : (
                                <div
                                  className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-100 mx-auto flex items-center justify-center"
                                  aria-hidden
                                >
                                  <ShoppingBag className="w-5 h-5 text-slate-300" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-800">{row.name}</TableCell>
                            <TableCell className="text-left tabular-nums text-slate-700">{row.value}</TableCell>
                            <TableCell className="text-left tabular-nums text-emerald-700 font-medium">
                              ₪{Number(row.profitTotal || 0).toLocaleString("he-IL", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
