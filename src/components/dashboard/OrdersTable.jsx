import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Eye, Search, ChevronRight, ChevronLeft } from "lucide-react";
import { TableSkeleton } from "./LoadingSkeleton";
import moment from "moment";

const PAGE_SIZE = 8;

const STATUS_CONFIG = {
  sent:      { label: "נשלח",    className: "bg-slate-100 text-slate-600" },
  opened:    { label: "נפתח",    className: "bg-yellow-100 text-yellow-700" },
  unpaid:    { label: "לא שולם", className: "bg-red-100 text-red-700" },
  cancelled: { label: "בוטל",    className: "bg-gray-100 text-gray-500" },
  error:     { label: "שגיאה",   className: "bg-red-100 text-red-700" },
  paid:      { label: "שולם",    className: "bg-emerald-100 text-emerald-700" },
};

function getDisplayStatus(order) {
  if (order.status && STATUS_CONFIG[order.status]) {
    return order.status;
  }

  if (order.linkCancelled) return 'cancelled';
  if (order.errors) return 'error';
  if (order.paymentStatus === 'paid') return 'paid';

  if (order.status === 'opened' || order.changeChain?.some(c => c.action === 'link_opened')) {
    return 'opened';
  }

  const createdDate = order._createdDate || order.date;
  if (createdDate) {
    const daysSinceCreation = moment().diff(moment(createdDate), 'days');
    if (daysSinceCreation >= 3 && order.paymentStatus !== 'paid') {
      return 'unpaid';
    }
  }

  return 'sent';
}

export default function OrdersTable({ orders, isLoading, onSelectOrder }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(o => {
      const id = (o.orderNumber || o.id || '').toLowerCase();
      const name = `${o.customer?.firstName || o.customerName || ''} ${o.customer?.lastName || ''}`.toLowerCase();
      const phone = o.customer?.phone || o.customerPhone || '';
      const email = o.customer?.email || o.customerEmail || '';
      return id.includes(q) || name.includes(q) || phone.includes(q) || email.toLowerCase().includes(q);
    });
  }, [orders, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
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
          <div className="relative max-w-xs w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש לפי שם, טלפון, מס׳ הזמנה..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
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
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="text-right text-xs font-medium text-slate-500 w-12">
                    <Eye className="w-3.5 h-3.5" />
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500">סטטוס</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500">סה״כ</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500">לקוח</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500">תאריך</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500">מס׳ הזמנה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {paginated.map((order, index) => {
                    const displayStatus = getDisplayStatus(order);
                    const statusCfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.sent;
                    const customerName = order.customer
                      ? `${order.customer.firstName} ${order.customer.lastName}`
                      : order.customerName || '';
                    const orderDate = order._createdDate || order.date;
                    const orderId = order.orderNumber || order.id || order._id;

                    return (
                      <motion.tr
                        key={order._id || order.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.03 }}
                        className="cursor-pointer hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0"
                        onClick={() => onSelectOrder(order)}
                      >
                        <TableCell className="text-center">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mx-auto">
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[11px] border-0 font-medium ${statusCfg.className}`}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-800">
                          ₪{(order.totalPrice ?? order.total ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {customerName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {orderDate ? moment(orderDate).format("DD/MM/YY HH:mm") : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {orderId}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between" dir="rtl">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
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
                onClick={() => setPage(p => Math.max(p - 1, 1))}
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
    </motion.div>
  );
}
