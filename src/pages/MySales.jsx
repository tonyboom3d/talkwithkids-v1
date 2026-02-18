import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, ShoppingBag, Download, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";
import moment from "moment";

const MY_REP = "שרה מ.";

const myOrders = DEMO_ORDERS.filter(o =>
  o.timeline.some(t => t.by === MY_REP)
);

const chartData = [
  { month: "ספט׳", revenue: 1200 },
  { month: "אוק׳", revenue: 2800 },
  { month: "נוב׳", revenue: 1900 },
  { month: "דצמ׳", revenue: 3400 },
  { month: "ינו׳", revenue: 2600 },
  { month: "פבר׳", revenue: myOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0) },
];

export default function MySales() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const totalRevenue = myOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const totalOrders = myOrders.length;
  const paidCount = myOrders.filter(o => o.paymentStatus === "paid").length;
  const conversionRate = totalOrders ? Math.round((paidCount / totalOrders) * 100) : 0;

  const filtered = useMemo(() => {
    return myOrders.filter(o => {
      const matchesSearch =
        o.id.includes(search) ||
        `${o.customer.firstName} ${o.customer.lastName}`.includes(search) ||
        o.customer.phone?.includes(search);
      const matchesStatus = statusFilter === "all" || o.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const handleExport = () => {
    const rows = [
      ["מס׳ הזמנה", "תאריך", "לקוח", "טלפון", "סכום", "סטטוס"],
      ...filtered.map(o => [
        o.id,
        moment(o.date).format("DD/MM/YYYY"),
        `${o.customer.firstName} ${o.customer.lastName}`,
        o.customer.phone || "",
        o.total,
        o.paymentStatus === "paid" ? "שולם" : "לא שולם",
      ]),
    ];
    const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "המכירות_שלי.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">המכירות שלי</h1>
            <p className="text-sm text-slate-400 mt-0.5">סיכום הפעילות שלך</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2 text-sm h-9">
            <Download className="w-4 h-4" />
            ייצוא לאקסל
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "סה״כ הכנסות", value: `₪${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
            { label: "הזמנות שנוצרו", value: totalOrders, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
            { label: "הזמנות ששולמו", value: paidCount, icon: BarChart2, color: "text-violet-600 bg-violet-50" },
            { label: "אחוז המרה", value: `${conversionRate}%`, icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
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

        {/* Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">הכנסות לפי חודש</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `₪${v}`} />
              <Tooltip formatter={(v) => [`₪${v.toLocaleString()}`, "הכנסות"]} />
              <Bar dataKey="revenue" fill="#1e293b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap justify-between">
            <h3 className="text-sm font-semibold text-slate-700">הזמנות שלי</h3>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-32 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="paid">שולם</SelectItem>
                  <SelectItem value="unpaid">לא שולם</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="חיפוש..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 text-xs pr-8 w-44 border-slate-200"
                  dir="rtl"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-right">
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">מס׳ הזמנה</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">לקוח</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">תאריך</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">סכום</th>
                  <th className="px-4 py-3 text-xs text-slate-400 font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{order.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{order.customer.firstName} {order.customer.lastName}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{moment(order.date).format("DD/MM/YY")}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">₪{order.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[11px] border-0 ${order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {order.paymentStatus === "paid" ? "שולם" : "לא שולם"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">לא נמצאו הזמנות</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}