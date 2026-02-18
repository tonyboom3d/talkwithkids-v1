import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Eye, Calendar, Hash } from "lucide-react";
import { TableSkeleton } from "./LoadingSkeleton";
import moment from "moment";

export default function OrdersTable({ orders, isLoading, onSelectOrder }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <Badge variant="outline" className="text-slate-500 border-slate-200 text-xs">
          {orders.length} הזמנות
        </Badge>
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-400" />
          הזמנות אחרונות
        </h3>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : orders.length === 0 ? (
        <div className="p-12 text-center">
          <CreditCard className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm text-slate-400">אין הזמנות עדיין</p>
        </div>
      ) : (
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
              <AnimatePresence>
                {orders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="cursor-pointer hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0"
                    onClick={() => onSelectOrder(order)}
                  >
                    <TableCell className="text-center">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mx-auto">
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[11px] border-0 font-medium ${
                        order.paymentStatus === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {order.paymentStatus === "paid" ? "שולם" : "לא שולם"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-800">
                      ₪{order.total?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {order.customer.firstName} {order.customer.lastName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {moment(order.date).format("DD/MM/YY HH:mm")}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {order.id}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}
    </motion.div>
  );
}