import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquare, Tag, Percent, DollarSign, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import CustomerSection from "../components/dashboard/CustomerSection";
import ProductSelector from "../components/dashboard/ProductSelector";
import StoreCouponPicker from "../components/dashboard/StoreCouponPicker";
import OrdersTable from "../components/dashboard/OrdersTable";
import OrderDetailPanel from "../components/dashboard/OrderDetailPanel";
import { useAuth } from "@/lib/IframeAuthContext";
import { usePostMessage, usePostMessageListener } from "@/hooks/usePostMessage";
import { DEMO_ORDERS, DEMO_PRODUCTS, DEMO_CUSTOMERS } from "../components/dashboard/DemoDataProvider";

/** לוגיקה מזוהה ל־`wix-velo/backend/helpers/couponHelper.js` — computeDiscountForSubtotal */
function computeDiscountForSubtotal(subtotal, coupon) {
  if (!coupon || subtotal <= 0) {
    return { discountAmount: 0, discountedTotal: subtotal };
  }
  const t = coupon.type;
  if (t === "PercentOff" || (coupon.percentOffRate != null && coupon.percentOffRate > 0)) {
    const pct = Math.min(100, Math.max(0, Number(coupon.percentOffRate) || 0));
    const discountAmount = subtotal * (pct / 100);
    return { discountAmount, discountedTotal: subtotal - discountAmount };
  }
  if (t === "MoneyOff" || (coupon.moneyOffAmount != null && coupon.moneyOffAmount > 0)) {
    const off = Math.min(subtotal, Math.max(0, Number(coupon.moneyOffAmount) || 0));
    return { discountAmount: off, discountedTotal: subtotal - off };
  }
  return { discountAmount: 0, discountedTotal: subtotal };
}

/** תצוגת הנחה בסגנון עברי: המספר ואז מינוס ואז ₪ (למשל 72- ₪) */
function formatDiscountLineShekels(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("he-IL")}- ₪`;
}

function isValidIsraeliPhone(phone) {
  return /^05\d{8}$/.test(String(phone || "").trim());
}

export default function Dashboard() {
  const { user, canViewOthers } = useAuth();
  const { send, request } = usePostMessage();

  const isDemo = !user;

  const [customerData, setCustomerData] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [notes, setNotes] = useState("");
  const [orderChanges, setOrderChanges] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentTag, setPaymentTag] = useState("");
  const [couponEnabled, setCouponEnabled] = useState(false);
  /** "create" = יצירת קופון חדש; "existing" = בחירת קופון מהחנות (רק אחד) */
  const [couponMode, setCouponMode] = useState("create");
  const [selectedStoreCoupon, setSelectedStoreCoupon] = useState(null);
  const [couponType, setCouponType] = useState("percent");
  const [couponValue, setCouponValue] = useState("");
  const [validationError, setValidationError] = useState("");

  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    if (isDemo) {
      setTimeout(() => { setOrders(DEMO_ORDERS); setIsLoadingOrders(false); }, 800);
      return;
    }
    try {
      const result = await request('GET_ORDERS');
      setOrders(result.orders || []);
    } catch (err) {
      console.error('[UI] Failed to load orders:', err);
      toast.error("שגיאה בטעינת ההזמנות");
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isDemo, request]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (paymentStatus !== "paid") return;
    setCouponEnabled(false);
    setCouponMode("create");
    setSelectedStoreCoupon(null);
    setCouponValue("");
  }, [paymentStatus]);

  usePostMessageListener('ORDER_STATUS_UPDATED', (payload) => {
    setOrders(prev => prev.map(o =>
      o._id === payload.recordId ? { ...o, ...payload.updates } : o
    ));
  });

  const showError = (msg) => {
    setValidationError(msg);
    setTimeout(() => setValidationError(""), 3700);
  };

  const handleSubmit = async () => {
    if (!customerData.firstName.trim()) {
      showError("יש למלא שם לקוח");
      return;
    }
    if (!isValidIsraeliPhone(customerData.phone)) {
      showError("יש למלא מספר פלאפון ישראלי תקין שמתחיל ב-05 ומכיל 10 ספרות");
      return;
    }
    if (selectedProducts.length === 0) {
      showError("יש לבחור לפחות מוצר אחד");
      return;
    }
    const total = selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0);
    if (total === 0) {
      showError("מחיר ההזמנה חייב להיות גדול מ-0");
      return;
    }
    if (paymentStatus === "paid" && !paymentTag) {
      showError("יש לבחור אופן תשלום עבור הזמנה ששולמה");
      return;
    }

    if (couponEnabled && paymentStatus !== "paid") {
      if (couponMode === "existing") {
        if (!selectedStoreCoupon) {
          showError("נא לבחור קופון מהרשימה");
          return;
        }
      } else {
        const sub = selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0);
        const val = parseFloat(couponValue) || 0;
        if (!String(couponValue).trim()) {
          showError("נא למלא ערך להנחה");
          return;
        }
        if (couponType === "percent" ? val >= 100 : val >= sub) {
          showError("ערך ההנחה לא תקין");
          return;
        }
      }
    }

    setIsSubmitting(true);

    if (isDemo) {
      setTimeout(() => {
        toast.success("(מצב דמו) קישור תשלום נוצר!");
        resetForm();
        setIsSubmitting(false);
      }, 1500);
      return;
    }

    try {
      let coupon = null;
      let existingCoupon = null;
      if (couponEnabled && paymentStatus !== "paid") {
        if (couponMode === "existing" && selectedStoreCoupon) {
          existingCoupon = { id: selectedStoreCoupon.id, code: selectedStoreCoupon.code };
        } else if (couponMode === "create") {
          coupon = { type: couponType, value: parseFloat(couponValue) };
        }
      }

      const result = await request('CREATE_ORDER', {
        customer: {
          ...customerData,
          firstName: customerData.firstName.trim(),
          lastName: customerData.lastName.trim(),
          phone: customerData.phone.trim(),
          contactId: selectedContact?.id || null,
        },
        products: selectedProducts.map(p => ({
          id: p.id, name: p.name, price: p.price, quantity: p.quantity, image: p.image,
        })),
        coupon,
        existingCoupon,
        notes,
        orderChanges,
        paymentStatus,
        paymentTag: paymentStatus === 'paid' ? paymentTag : '',
        totalPrice: total,
      });

      console.log('[UI] Order created:', result.recordId, result.checkoutLink);
      toast.success(
        result.orderNumber
          ? `הזמנה ${result.orderNumber} נוצרה בהצלחה!`
          : 'קישור תשלום נוצר בהצלחה. מספר הזמנה יוקצה לאחר תשלום הלקוח.'
      );
      resetForm();
      loadOrders();
    } catch (err) {
      console.error('[UI] Create order failed:', err);
      toast.error(err.message || "שגיאה ביצירת ההזמנה");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerData({ firstName: "", lastName: "", email: "", phone: "" });
    setSelectedContact(null);
    setSelectedProducts([]);
    setPaymentStatus("unpaid");
    setNotes("");
    setOrderChanges("");
    setPaymentTag("");
    setCouponEnabled(false);
    setCouponMode("create");
    setSelectedStoreCoupon(null);
    setCouponType("percent");
    setCouponValue("");
  };

  const handleCancelLink = async (orderId) => {
    if (isDemo) {
      setOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, linkCancelled: true, status: 'cancelled' }
        : o
      ));
      return;
    }
    try {
      await request('CANCEL_LINK', { recordId: orderId });
      loadOrders();
    } catch (err) {
      toast.error("שגיאה בביטול הקישור");
    }
  };

  const handleAddNote = async (orderId, noteText) => {
    if (isDemo) {
      toast.success("(מצב דמו) הערה נוספה");
      return;
    }
    try {
      await request('ADD_ORDER_NOTE', { recordId: orderId, note: noteText });
      toast.success("הערה נוספה בהצלחה");
      loadOrders();
    } catch (err) {
      toast.error("שגיאה בהוספת הערה");
    }
  };

  const handleResendWhatsapp = async (orderId) => {
    if (isDemo) {
      toast.success("(מצב דמו) הקישור נשלח שוב לוואטסאפ");
      return;
    }
    try {
      await request('RESEND_ORDER_WHATSAPP', { recordId: orderId });
      toast.success("הקישור נשלח שוב ללקוח בוואטסאפ");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בשליחה חוזרת לוואטסאפ");
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    if (isDemo) {
      setOrders(prev => prev.map(o => (o.id === orderId || o._id === orderId) ? { ...o, status } : o));
      toast.success("(מצב דמו) סטטוס ההזמנה עודכן");
      return;
    }
    try {
      await request('UPDATE_ORDER_STATUS', { recordId: orderId, status });
      toast.success("סטטוס ההזמנה עודכן");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בעדכון סטטוס");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (isDemo) {
      setOrders(prev => prev.map(o => (o.id === orderId || o._id === orderId) ? { ...o, status: "cancelled" } : o));
      toast.success("(מצב דמו) ההזמנה בוטלה");
      return;
    }
    try {
      await request('DELETE_ORDER', { recordId: orderId });
      toast.success("ההזמנה בוטלה");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בביטול ההזמנה");
    }
  };

  const handleCopyToClipboard = async (text) => {
    if (!text) {
      toast.error("אין תוכן להעתקה");
      return;
    }
    if (isDemo) {
      await navigator.clipboard.writeText(text);
      toast.success("(מצב דמו) התוכן הועתק");
      return;
    }
    try {
      await request('COPY_TO_CLIPBOARD', { text });
      toast.success("הקישור הועתק");
    } catch (err) {
      toast.error(err.message || "שגיאה בהעתקת התוכן");
    }
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
          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-full px-4 py-2">
              <span className="text-xs text-amber-700 font-medium">מצב דמו - לא מחובר לוויקס</span>
            </div>
          )}
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
            selectedContact={selectedContact}
            setSelectedContact={setSelectedContact}
          />

          <div className="border-t border-slate-100" />

          <ProductSelector
            isDemo={isDemo}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />

          {paymentStatus !== "paid" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.22 }}
              className="space-y-3"
            >
              <button
                type="button"
                disabled={selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0) === 0}
                onClick={() => {
                  if (selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0) > 0) {
                    setCouponEnabled(!couponEnabled);
                    setCouponValue("");
                    setSelectedStoreCoupon(null);
                    setCouponMode("create");
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full ${
                  selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0) === 0
                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                    : couponEnabled
                      ? "bg-violet-50 border-violet-300 text-violet-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                <Ticket className="w-4 h-4" />
                קופון הנחה להזמנה
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
                  >
                    <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap gap-2" dir="rtl">
                        <button
                          type="button"
                          onClick={() => { setCouponMode("create"); setSelectedStoreCoupon(null); }}
                          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                            couponMode === "create" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          יצירת קופון חדש
                        </button>
                        <button
                          type="button"
                          onClick={() => { setCouponMode("existing"); setCouponValue(""); }}
                          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                            couponMode === "existing" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          קופון קיים מהחנות
                        </button>
                      </div>

                      {couponMode === "existing" ? (
                        <StoreCouponPicker
                          isDemo={isDemo}
                          selectedCoupon={selectedStoreCoupon}
                          onSelect={setSelectedStoreCoupon}
                          disabled={false}
                        />
                      ) : (
                        <>
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
                            const isInvalid = couponType === "percent" ? val >= 100 : val >= total;
                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={couponType === "percent" ? 99 : Math.max(0, total - 1)}
                                    value={couponValue}
                                    onChange={(e) => setCouponValue(e.target.value)}
                                    placeholder={couponType === "percent" ? "% הנחה" : "סכום הנחה (₪)"}
                                    className="h-9 text-sm border-slate-200 bg-white"
                                    dir="ltr"
                                  />
                                  <span className="text-sm text-slate-500">{couponType === "percent" ? "%" : "₪"}</span>
                                </div>
                                {isInvalid && couponValue !== "" && (
                                  <p className="text-xs text-red-500">
                                    ההנחה לא יכולה להיות גדולה מ-{couponType === "percent" ? "99%" : `₪${(total - 1).toLocaleString()}`}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </>
                      )}

                      {(() => {
                        const total = selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0);
                        if (total <= 0) return null;

                        if (couponMode === "existing" && selectedStoreCoupon) {
                          const { discountAmount, discountedTotal } = computeDiscountForSubtotal(total, selectedStoreCoupon);
                          if (discountAmount <= 0) return null;
                          return (
                            <div className="bg-white rounded-lg p-3 space-y-1.5 border border-violet-100" dir="rtl">
                              <div className="flex flex-wrap items-center justify-start gap-2 text-sm">
                                <span className="text-slate-500 shrink-0">הנחה:</span>
                                <Badge
                                  variant="outline"
                                  className="shrink-0 border-violet-200 bg-violet-50/80 text-[10px] font-normal text-violet-800"
                                >
                                  {selectedStoreCoupon.code
                                    ? `קופון ${selectedStoreCoupon.code}`
                                    : "קופון"}
                                </Badge>
                                <span className="text-red-500 font-medium tabular-nums" dir="ltr">
                                  {formatDiscountLineShekels(discountAmount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-start gap-2 text-sm border-t border-violet-100 pt-1.5">
                                <span className="text-slate-500 shrink-0">מחיר סופי:</span>
                                <span className="font-bold text-violet-700 text-base tabular-nums" dir="ltr">
                                  ₪{discountedTotal.toLocaleString("he-IL")}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        if (couponMode === "create") {
                          const val = parseFloat(couponValue) || 0;
                          const discountAmount = couponType === "percent" ? (total * val) / 100 : val;
                          const discountedTotal = total - discountAmount;
                          const isInvalid = couponType === "percent" ? val >= 100 : val >= total;
                          if (val <= 0 || isInvalid) return null;
                          return (
                            <div className="bg-white rounded-lg p-3 space-y-1.5 border border-violet-100" dir="rtl">
                              <div className="flex flex-wrap items-center justify-start gap-2 text-sm">
                                <span className="text-slate-500 shrink-0">הנחה:</span>
                                <Badge
                                  variant="outline"
                                  className="shrink-0 border-violet-200 bg-violet-50/80 text-[10px] font-normal text-violet-800"
                                >
                                  קופון חדש
                                </Badge>
                                <span className="text-red-500 font-medium tabular-nums" dir="ltr">
                                  {formatDiscountLineShekels(discountAmount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-start gap-2 text-sm border-t border-violet-100 pt-1.5">
                                <span className="text-slate-500 shrink-0">מחיר סופי:</span>
                                <span className="font-bold text-violet-700 text-base tabular-nums" dir="ltr">
                                  ₪{discountedTotal.toLocaleString("he-IL")}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          <div className="border-t border-slate-100" />

          {/* Payment Tag */}
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
                      <span>הוספת הערות לשדה זה משנה את אופן השילוח מתפוז לשילוח דרך חן</span>
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
            className="space-y-2"
          >
            <AnimatePresence>
              {validationError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-sm text-red-500 text-center font-medium"
                >
                  {validationError}
                </motion.p>
              )}
            </AnimatePresence>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 bg-[#30D46B] hover:bg-[#28b85f] text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  יוצר קישור תשלום...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                 יצירת קישור לתשלום ושליחה לוואטסאפ
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Orders Table */}
        <OrdersTable
          orders={orders}
          isLoading={isLoadingOrders}
          onCopyToClipboard={handleCopyToClipboard}
          onResendWhatsapp={handleResendWhatsapp}
          onUpdateStatus={handleUpdateOrderStatus}
          onDeleteOrder={handleDeleteOrder}
        />
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailPanel
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onAddNote={handleAddNote}
            onCancelLink={handleCancelLink}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
