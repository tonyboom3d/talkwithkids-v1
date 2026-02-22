import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, TrendingUp, ShoppingBag, CreditCard, Users } from "lucide-react";
import moment from "moment";
import DateRangePicker from "../components/dashboard/DateRangePicker";
import OrderDetailPanel from "../components/dashboard/OrderDetailPanel";

const MY_NAME = "שרה מ.";

function exportToCSV(orders) {
  const rows = [
    ["מספר הזמנה", "תאריך", "לקוח", "טלפון", "מוצרים", "סה\"כ", "סטטוס תשלום"],
    ...orders.map(o => [
      o.id,
      moment(o.date).format("DD/MM/YYYY HH:mm"),
      `${o.customer.firstName} ${o.customer.lastName}`,
      o.customer.phone || "",
      o.products.map(p => `${p.name} x${p.quantity}`).join(" | "),
      `₪${o.total}`,
      o.paymentStatus === "paid" ? "שולם" : "לא שולם",
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
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleAddNote = (orderId, noteText) => {
    // In production this would persist; for now just update local state
  };

  const myOrders = useMemo(() =>
    DEMO_ORDERS.filter(o =>
      o.timeline.some(t => t.by === MY_NAME && t.type === "created")
    ), []);

  const filtered = useMemo(() => {
    return myOrders.filter(o => {
      const q = search.toLowerCase();
      const matchSearch = !search.trim() ||
        o.id.toLowerCase().includes(q) ||
        `${o.customer.firstName} ${o.customer.lastName}`.includes(q) ||
        o.customer.phone?.includes(q);
      const date = moment(o.date);
      const matchDate = (!dateRange.from || date.isSameOrAfter(moment(dateRange.from).startOf("day"))) &&
                        (!dateRange.to || date.isSameOrBefore(moment(dateRange.to).endOf("day")));
      return matchSearch && matchDate;
    });
  }, [myOrders, search, dateRange]);

  const totalRevenue = filtered.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const paidCount = filtered.filter(o => o.paymentStatus === "paid").length;
  const unpaidCount = filtered.filter(o => o.paymentStatus === "unpaid").length;
  const avgOrder = filtered.length ? Math.round(totalRevenue / (paidCount || 1)) : 0;

  return (
    <div className="min-h-screen bg-[#f8f8f8] p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6 relative">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">המכירות שלי</h1>
            <p className="text-sm text-slate-400 mt-0.5">כל ההזמנות שנוצרו על ידך</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <Button onClick={() => exportToCSV(filtered)} className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-9">
              <Download className="w-4 h-4" />
              ייצוא לאקסל
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "הכנסות", value: `₪${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
            { label: "הזמנות", value: myOrders.length, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
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

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-800">רשימת הזמנות</h3>
            <div className="relative max-w-xs w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)}
                className="pr-9 h-9 text-sm border-slate-200 text-right" dir="rtl" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">מספר הזמנה</th>
                  <th className="text-right px-4 py-3 font-medium">לקוח</th>
                  <th className="text-right px-4 py-3 font-medium">מוצרים</th>
                  <th className="text-right px-4 py-3 font-medium">סה"כ</th>
                  <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                  <th className="text-right px-4 py-3 font-medium">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                 <tr><td colSpan={6} className="text-center py-10 text-slate-400">לא נמצאו הזמנות</td></tr>
                ) : filtered.map((order, i) => (
                 <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                   onClick={() => setSelectedOrder(order)}
                   className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer">
                   <td className="px-4 py-3 font-medium text-slate-700">{order.id}</td>
                   <td className="px-4 py-3 text-slate-600">{order.customer.firstName} {order.customer.lastName}</td>
                   <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">
                     {order.products.map(p => p.name).join("، ")}
                   </td>
                   <td className="px-4 py-3 font-semibold text-slate-700">₪{order.total.toLocaleString()}</td>
                   <td className="px-4 py-3">
                     <Badge className={`border-0 text-xs ${order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                       {order.paymentStatus === "paid" ? "שולם" : "לא שולם"}
                     </Badge>
                   </td>
                   <td className="px-4 py-3 text-slate-400 text-xs">{moment(order.date).format("DD/MM/YY")}</td>
                 </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailPanel
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onAddNote={handleAddNote}
          />
        )}
      </AnimatePresence>
    </div>
  );
}