import React from "react";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, Users, ShoppingBag, Award } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";

const COLORS = ["#1e293b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

const monthlyData = [
  { month: "ספט׳", הכנסות: 1200, הזמנות: 4 },
  { month: "אוק׳", הכנסות: 2800, הזמנות: 9 },
  { month: "נוב׳", הכנסות: 1900, הזמנות: 6 },
  { month: "דצמ׳", הכנסות: 3400, הזמנות: 11 },
  { month: "ינו׳", הכנסות: 2600, הזמנות: 8 },
  { month: "פבר׳", הכנסות: DEMO_ORDERS.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0), הזמנות: DEMO_ORDERS.length },
];

const paymentPie = [
  { name: "שולם", value: DEMO_ORDERS.filter(o => o.paymentStatus === "paid").length },
  { name: "לא שולם", value: DEMO_ORDERS.filter(o => o.paymentStatus === "unpaid").length },
];

const topProducts = (() => {
  const map = {};
  DEMO_ORDERS.forEach(o => o.products.forEach(p => {
    map[p.name] = (map[p.name] || 0) + p.quantity;
  }));
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
})();

export default function Statistics() {
  const totalRevenue = DEMO_ORDERS.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const avgOrder = Math.round(totalRevenue / (DEMO_ORDERS.filter(o => o.paymentStatus === "paid").length || 1));
  const conversionRate = Math.round((paymentPie[0].value / DEMO_ORDERS.length) * 100);

  return (
    <div className="min-h-screen bg-[#fafafa] p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-slate-900">סטטיסטיקות</h1>
          <p className="text-sm text-slate-400 mt-0.5">תמונת מצב כוללת של הפעילות</p>
        </motion.div>

        {/* KPIs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "סה״כ הכנסות", value: `₪${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
            { label: "סה״כ הזמנות", value: DEMO_ORDERS.length, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
            { label: "ממוצע הזמנה", value: `₪${avgOrder.toLocaleString()}`, icon: BarChart2, color: "text-violet-600 bg-violet-50" },
            { label: "אחוז המרה", value: `${conversionRate}%`, icon: Award, color: "text-amber-600 bg-amber-50" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Monthly Revenue */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">הכנסות לפי חודש</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `₪${v}`} />
                <Tooltip formatter={(v) => [`₪${v.toLocaleString()}`, "הכנסות"]} />
                <Line type="monotone" dataKey="הכנסות" stroke="#1e293b" strokeWidth={2} dot={{ r: 4, fill: "#1e293b" }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Payment Pie */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">סטטוס תשלומים</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {paymentPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Top Products */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">מוצרים מובילים</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topProducts} layout="vertical" barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={140} />
              <Tooltip formatter={(v) => [v, "כמות"]} />
              <Bar dataKey="qty" fill="#1e293b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}