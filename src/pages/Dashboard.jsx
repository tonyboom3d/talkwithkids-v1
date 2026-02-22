import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, TestTube, CreditCard, MessageSquare, Tag, Percent, DollarSign, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import CustomerSection from "../components/dashboard/CustomerSection";
import ProductSelector from "../components/dashboard/ProductSelector";
import OrdersTable from "../components/dashboard/OrdersTable";
import OrderDetailPanel from "../components/dashboard/OrderDetailPanel";
import TasksPanel from "../components/tasks/TasksPanel";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";

export default function Dashboard() {
  const [isDemo, setIsDemo] = useState(true);
  const [customerData, setCustomerData] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderCounter, setOrderCounter] = useState(1005);
  const [showTasks, setShowTasks] = useState(false);

  // Load orders
  useEffect(() => {
    setIsLoadingOrders(true);
    const timer = setTimeout(() => {
      if (isDemo) {
        setOrders(DEMO_ORDERS);
      } else {
        setOrders([]);
      }
      setIsLoadingOrders(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isDemo]);

  const handleSubmit = () => {
    if (!customerData.phone && selectedProducts.length === 0) {
      toast.error("יש למלא טלפון ולבחור מוצרים");
      return;
    }
    if (!customerData.phone) {
      toast.error("מספר טלפון הוא שדה חובה");
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error("יש לבחור לפחות מוצר אחד");
      return;
    }

    setIsSubmitting(true);

    // Simulate Velo API call
    setTimeout(() => {
      const newOrder = {
        id: `ORD-${orderCounter}`,
        date: new Date().toISOString(),
        customer: { ...customerData },
        products: selectedProducts.map(p => ({ id: p.id, name: p.name, price: p.price, quantity: p.quantity })),
        total: selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0),
        paymentStatus: paymentStatus,
        notes: notes,
        paymentLink: `https://example.com/pay/${Math.random().toString(36).slice(2, 10)}`,
        timeline: [
          { type: "created", text: "נוצר קישור תשלום", by: "משתמש נוכחי", date: new Date().toISOString() },
          { type: "sent", text: "נשלח קישור ללקוח", by: "מערכת", date: new Date().toISOString() },
        ],
        orderNotes: notes ? [{ id: `n-${Date.now()}`, text: notes, by: "משתמש נוכחי", date: new Date().toISOString() }] : [],
      };

      setOrders(prev => [newOrder, ...prev]);
      setOrderCounter(prev => prev + 1);
      setCustomerData({ firstName: "", lastName: "", email: "", phone: "" });
      setSelectedProducts([]);
      setPaymentStatus("unpaid");
      setNotes("");
      setIsSubmitting(false);
      toast.success("קישור תשלום נוצר ונשלח בהצלחה!");
    }, 1500);
  };

  const handleAddNote = (orderId, noteText) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id === orderId) {
          const newNote = {
            id: `n-${Date.now()}`,
            text: noteText,
            by: "משתמש נוכחי",
            date: new Date().toISOString(),
          };
          const newTimeline = [
            ...order.timeline,
            { type: "note", text: `נוספה הערה: ${noteText}`, by: "משתמש נוכחי", date: new Date().toISOString() },
          ];
          const updated = {
            ...order,
            orderNotes: [...order.orderNotes, newNote],
            timeline: newTimeline,
          };
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(updated);
          }
          return updated;
        }
        return order;
      })
    );
    toast.success("הערה נוספה בהצלחה");
  };

  return (
    <div className="min-h-screen bg-[#fafafa]" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div className="text-right">
            <h1 className="text-xl font-bold text-slate-900">ניהול הזמנות</h1>
            <p className="text-sm text-slate-400 mt-0.5">יצירת קישורי תשלום ומעקב הזמנות</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTasks(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <CheckSquare className="w-4 h-4 text-slate-400" />
              משימות
            </button>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2" dir="ltr">
              <TestTube className={`w-4 h-4 transition-colors ${isDemo ? 'text-violet-500' : 'text-slate-300'}`} />
              <Switch
                id="demo-toggle"
                checked={isDemo}
                onCheckedChange={setIsDemo}
              />
              <Label htmlFor="demo-toggle" className="text-xs text-slate-500 cursor-pointer">מצב דמו</Label>
            </div>
          </div>
        </motion.div>

        {/* Order Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-6"
        >
          <CustomerSection
            isDemo={isDemo}
            customerData={customerData}
            setCustomerData={setCustomerData}
          />

          <div className="border-t border-slate-100" />

          <ProductSelector
            isDemo={isDemo}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />

          <div className="border-t border-slate-100" />

          {/* Payment Status */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-[18px] h-[18px] text-slate-400" />
              <Label className="text-sm font-medium text-slate-700">סטטוס תשלום</Label>
            </div>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="h-11 text-sm border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    לא שולם
                  </div>
                </SelectItem>
                <SelectItem value="paid">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    שולם
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-[18px] h-[18px] text-slate-400" />
              <Label className="text-sm font-medium text-slate-700">הערות</Label>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסף הערה להזמנה..."
              className="min-h-[80px] text-sm border-slate-200 focus:border-slate-400 resize-none"
              dir="rtl"
            />
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.25 }}
          >
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  יוצר קישור תשלום...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  צור קישור תשלום ושלח
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Orders Table */}
        <OrdersTable
          orders={orders}
          isLoading={isLoadingOrders}
          onSelectOrder={setSelectedOrder}
        />
      </div>

      {/* Order Detail Side Panel */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailPanel
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onAddNote={handleAddNote}
          />
        )}
      </AnimatePresence>

      {/* Tasks Panel */}
      <AnimatePresence>
        {showTasks && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTasks(false)} className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" />
            <TasksPanel onClose={() => setShowTasks(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}