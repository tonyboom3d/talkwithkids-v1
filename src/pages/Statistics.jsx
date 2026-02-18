import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, ShoppingBag, CreditCard, Percent } from "lucide-react";
import moment from "moment";

const MY_NAME = "שרה מ.";
const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"];

export default function Statistics() {
  const myOrders = useMemo(() =>
    DEMO_ORDERS.filter(o => o.timeline.some(t => t.by === MY_NAME && t.type === "created")), []);

  const totalRevenue = myOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const paidCount = myOrders.filter(o => o.paymentStatus === "paid").length;
  const conversionRate = myOrders.length ? Math.round((paidCount / myOrders.length) * 100) : 0;

  const byDay = useMemo(() => {
    const map = {};
    myOrders.forEach(o => {
      const day = moment(o.date).format("DD/MM");
      if (!map[day]) map[day] = { day, revenue: 0, orders: 0 };
      if (o.paymentStatus === "paid") map[day].revenue += o.total;
      map[day].orders += 1;
    });
    return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
  }, [myOrders]);

  const productStats = useMemo(() => {
    const map = {};
    myOrders.forEach(o => o.products.forEach(p => {
      if (!map[p.name]) map[p.name] = { name: p.name, value: 0 };
      map[p.name].value += p.quantity;
    }));
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [myOrders]);

  const paymentPie = [
    { name: "שולם", value: paidCount },
    { name: "לא שולם", value: myOrders.length - paidCount },
  ];

  return (
    <div className="min-h-screen bg-[#f8f8f8] p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-slate-900">סטטיסטיקות</h1>
          <p className="text-sm text-slate-400 mt-0.5">סקירת ביצועי המכירות שלך</p>
        </motion.div>

        {/* KPIs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "סה\"כ הכנסות", value: `₪${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
            { label: "הזמנות שנוצרו", value: myOrders.length, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
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
          {/* Revenue by Day */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">הכנסות לפי יום</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byDay}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip formatter={(v) => [`₪${v}`, "הכנסות"]} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Payment Pie */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">סטטוס תשלומים</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Top Products */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">מוצרים מובילים (כמות)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={productStats} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {productStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
}