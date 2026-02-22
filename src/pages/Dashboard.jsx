import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, TestTube, MessageSquare, Tag, Percent, DollarSign, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import CustomerSection from "../components/dashboard/CustomerSection";
import ProductSelector from "../components/dashboard/ProductSelector";
import OrdersTable from "../components/dashboard/OrdersTable";
import OrderDetailPanel from "../components/dashboard/OrderDetailPanel";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";

export default function Dashboard() {
  const [isDemo, setIsDemo] = useState(true);
  const [customerData, setCustomerData] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [notes, setNotes] = useState("");
  const [orderChanges, setOrderChanges] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderCounter, setOrderCounter] = useState(1005);
  const [paymentTag, setPaymentTag] = useState("");
  const [couponEnabled, setCouponEnabled] = useState(false);
  const [couponType, setCouponType] = useState("percent");
  const [couponValue, setCouponValue] = useState("");

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
    if (!customerData.phone) {
      toast.error("מספר טלפון הוא שדה חובה");
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error("יש לבחור לפחות מוצר אחד");
      return;
    }
    const total = selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0);
    if (total === 0) {
      toast.error("מחיר ההזמנה חייב להיות גדול מ-0");
      return;
    }
    if (paymentStatus === "paid" && !paymentTag) {
      toast.error("יש לבחור אופן תשלום עבור הזמנה ששולמה");
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
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
          />

          <div className="border-t border-slate-100" />

          <ProductSelector
            isDemo={isDemo}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />

          {/* Coupon */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.22 }}
            className="space-y-3"
          >
            <button
              type="button"
              disabled={selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0) === 0}
              onClick={() => { if (selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0) > 0) { setCouponEnabled(!couponEnabled); setCouponValue(""); } }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full ${
                selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0) === 0
                  ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                  : couponEnabled
                    ? "bg-violet-50 border-violet-300 text-violet-700"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
              }`}
            >
              <Ticket className="w-4 h-4" />
              יצירת קופון הנחה להזמנה
              <div className={`mr-auto w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                couponEnabled ? "bg-violet-600 border-violet-600" : "border-slate-300"
              }`}>
                {couponEnabled && <div className="w-2 h-2 bg-white rounded-sm" />}
              </div>
            </button>

            <AnimatePresence>
              {couponEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-4 space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setCouponType("percent"); setCouponValue(""); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          couponType === "percent" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        <Percent className="w-3 h-3" />
                        אחוזים
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCouponType("fixed"); setCouponValue(""); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          couponType === "fixed" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        <DollarSign className="w-3 h-3" />
                        מחיר קבוע
                      </button>
                    </div>
                    {(() => {
                      const total = selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0);
                      const val = parseFloat(couponValue) || 0;
                      const discountAmount = couponType === "percent" ? (total * val / 100) : val;
                      const discountedTotal = total - discountAmount;
                      const isInvalid = couponType === "percent" ? val >= 100 : val >= total;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={couponType === "percent" ? 99 : total - 1}
                              value={couponValue}
                              onChange={e => setCouponValue(e.target.value)}
                              placeholder={couponType === "percent" ? "% הנחה" : "סכום הנחה (₪)"}
                              className="h-9 text-sm border-slate-200 bg-white"
                              dir="ltr"
                            />
                            <span className="text-sm text-slate-500">{couponType === "percent" ? "%" : "₪"}</span>
                          </div>
                          {isInvalid && (
                            <p className="text-xs text-red-500">ההנחה לא יכולה להיות גדולה מ-{couponType === "percent" ? "99%" : `₪${(total - 1).toLocaleString()}`}</p>
                          )}
                          {val > 0 && !isInvalid && total > 0 && (
                            <div className="bg-white rounded-lg p-3 space-y-1.5 border border-violet-100">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-red-500 font-medium">-₪{discountAmount.toLocaleString()}</span>
                                <span className="text-slate-500">הנחה:</span>
                              </div>
                              <div className="flex items-center justify-between text-sm border-t border-violet-100 pt-1.5">
                                <span className="font-bold text-violet-700 text-base">₪{discountedTotal.toLocaleString()}</span>
                                <span className="text-slate-500">מחיר סופי:</span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="border-t border-slate-100" />

          {/* Payment Tag - shown only when paid */}
          <AnimatePresence>
            {paymentStatus === "paid" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-[18px] h-[18px] text-slate-400" />
                    <Label className="text-sm font-medium text-slate-700">אמצעי תשלום</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["ביט", "פייבוקס", "הוראת קבע", "העברה בנקאית", "קארדקום טלפונית", "שולם דרך וויקס"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPaymentTag(paymentTag === tag ? "" : tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          paymentTag === tag
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* הערות להזמנה */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-[18px] h-[18px] text-slate-400" />
                  <Label className="text-sm font-medium text-slate-700">הערות להזמנה</Label>
                  <div className="relative group">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center cursor-help font-bold">?</span>
                    <div className="absolute bottom-full right-0 mb-1.5 w-56 bg-slate-800 text-white text-xs rounded-lg p-2.5 hidden group-hover:block z-10 text-right leading-relaxed shadow-lg">
                      הערות אלה הן בשבילכן והלקוח\ה לא רואה אותן
                    </div>
                  </div>
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הוסף הערה פנימית..."
                  className="min-h-[70px] text-sm border-slate-200 focus:border-slate-400 resize-none"
                  dir="rtl"
                />
              </div>

              {/* שינויים להזמנה */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-[18px] h-[18px] text-slate-400" />
                  <Label className="text-sm font-medium text-slate-700">שינויים להזמנה</Label>
                  <div className="relative group">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center cursor-help font-bold">?</span>
                    <div className="absolute bottom-full right-0 mb-1.5 w-64 bg-slate-800 text-white text-xs rounded-lg p-2.5 hidden group-hover:block z-10 text-right leading-relaxed shadow-lg">
                      הערות לשינויים בהזמנות עצמן, במידה ויש שינוי בהזמנה, ההזמנה לא תישלח דרך תפוז*
                    </div>
                  </div>
                </div>
                <Textarea
                  value={orderChanges}
                  onChange={(e) => setOrderChanges(e.target.value)}
                  placeholder="הוסף שינוי להזמנה..."
                  className="min-h-[70px] text-sm border-slate-200 focus:border-slate-400 resize-none"
                  dir="rtl"
                />
                <AnimatePresence>
                  {orderChanges.trim() && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700"
                    >
                      <motion.span
                        animate={{ rotate: [0, -5, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        className="text-amber-500 text-sm shrink-0"
                      >
                        ⚠️
                      </motion.span>
                      <span>הוספת הערות לזה זה משנה את אופן השילוח מתפוז לשילוח דרך חן</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
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
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
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


    </div>
  );
}