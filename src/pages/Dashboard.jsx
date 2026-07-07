import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Loader2, MessageSquare, Tag, Ticket, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import CustomerSection from "../components/dashboard/CustomerSection";
import ProductSelector from "../components/dashboard/ProductSelector";
import StoreCouponPicker from "../components/dashboard/StoreCouponPicker";
import OrdersTable from "../components/dashboard/OrdersTable";
import OrderDetailPanel from "../components/dashboard/OrderDetailPanel";
import TransactionPickerDialog from "../components/dashboard/TransactionPickerDialog";
import EmployeeFilterField from "../components/dashboard/EmployeeFilterField";
import EmployeeAssignField from "../components/dashboard/EmployeeAssignField";
import { useAuth } from "@/lib/IframeAuthContext";
import { usePostMessage, usePostMessageListener } from "@/hooks/usePostMessage";
import { useScrollToTopOnOpen } from "@/hooks/useScrollToTopOnOpen";
import { buildPublicOrderUrl } from "@/utils/dashboardOrders";
import { isValidIsraeliPhone, normalizeIsraeliPhone } from "@/utils/phoneUtils";
import { buildCreatorOptions, filterOrdersByCreators } from "@/utils/orderCreatorFilter";
import { DEMO_ORDERS } from "../components/dashboard/DemoDataProvider";

const DASHBOARD_ORDERS_REFRESH_KEY = "twk_dashboard_orders_last_refresh";
const CARDCOM_PHONE_PAYMENT_METHOD = "קארדקום טלפונית";
const STANDING_ORDER_PAYMENT_METHOD = "הוראת קבע";
const EXCLUSIVE_PRODUCT_ID = "6d11d520-c010-552f-a976-b898ce21feda";

function readSessionRefresh(key) {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(key) || "";
}

function saveSessionRefresh(key, value) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, value);
}

/** לוגיקה מזוהה ל־`src/backend/helpers/couponHelper.jsw` — computeDiscountForSubtotal */
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

function parseCustomPayAmount(value, subtotal) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return {
      hasValue: false,
      isValid: false,
      payAmount: 0,
      discountAmount: 0,
    };
  }

  const payAmount = Number(rawValue);
  const normalizedSubtotal = Math.max(0, Number(subtotal) || 0);
  const isValid = Number.isFinite(payAmount) && payAmount >= 0 && payAmount <= normalizedSubtotal;

  return {
    hasValue: true,
    isValid,
    payAmount: Number.isFinite(payAmount) ? payAmount : 0,
    discountAmount: Number.isFinite(payAmount) ? Math.max(0, normalizedSubtotal - payAmount) : 0,
  };
}

function isValidInternationalPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/** מפרק שם מלא לשם פרטי ושם משפחה (לפחות שתי מילים) */
function splitFullName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return null;
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function Dashboard() {
  const { user, canViewOthers, canGenerateInvoices, commissionRate } = useAuth();
  const { request } = usePostMessage();

  const isDemo = !user;

  const [customerData, setCustomerData] = useState({ firstName: "", lastName: "", phone: "" });
  const [allowNonIsraeliPhone, setAllowNonIsraeliPhone] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [notes, setNotes] = useState("");
  const [orderChanges, setOrderChanges] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => readSessionRefresh(DASHBOARD_ORDERS_REFRESH_KEY));
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentTag, setPaymentTag] = useState("");
  const [partialPaidAmount, setPartialPaidAmount] = useState("");
  const [hasCustomPaidAmount, setHasCustomPaidAmount] = useState(false);
  const [actualPaidAmount, setActualPaidAmount] = useState("");
  const [couponEnabled, setCouponEnabled] = useState(false);
  /** "create" = יצירת קופון חדש; "existing" = בחירת קופון מהחנות (רק אחד) */
  const [couponMode, setCouponMode] = useState("create");
  const [selectedStoreCoupon, setSelectedStoreCoupon] = useState(null);
  const [couponValue, setCouponValue] = useState("");
  const [validationError, setValidationError] = useState("");
  const [createdOrderState, setCreatedOrderState] = useState(null);
  const [isConfirmingSend, setIsConfirmingSend] = useState(false);
  const [includeAllCreators, setIncludeAllCreators] = useState(true);
  const [selectedCreatorKeys, setSelectedCreatorKeys] = useState(() => new Set());
  const [showTransactionPicker, setShowTransactionPicker] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");

  const creatorOptions = useMemo(
    () => (canViewOthers ? buildCreatorOptions(orders) : []),
    [canViewOthers, orders]
  );
  const visibleOrders = useMemo(
    () => filterOrdersByCreators(orders, canViewOthers, includeAllCreators, selectedCreatorKeys, user),
    [orders, canViewOthers, includeAllCreators, selectedCreatorKeys, user]
  );
  const selectedProductsTotal = useMemo(
    () => selectedProducts.reduce((sum, product) => {
      const price = Number.isFinite(Number(product.price)) ? Number(product.price) : 0;
      return sum + price * product.quantity;
    }, 0),
    [selectedProducts]
  );

  const hasExclusiveProduct = useMemo(
    () => selectedProducts.some(p => p.id === EXCLUSIVE_PRODUCT_ID),
    [selectedProducts]
  );

  const handleSetSelectedProducts = useCallback((updaterOrValue) => {
    setSelectedProducts(prev => {
      const next = typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;
      if (next.some(p => p.id === EXCLUSIVE_PRODUCT_ID) && next.length > 1) {
        return next.filter(p => p.id === EXCLUSIVE_PRODUCT_ID);
      }
      return next;
    });
  }, []);

  useScrollToTopOnOpen(Boolean(createdOrderState));

  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    if (isDemo) {
      setTimeout(() => {
        const nowIso = new Date().toISOString();
        setOrders(DEMO_ORDERS);
        setLastRefreshedAt(nowIso);
        saveSessionRefresh(DASHBOARD_ORDERS_REFRESH_KEY, nowIso);
        setIsLoadingOrders(false);
      }, 800);
      return;
    }
    try {
      const result = await request('GET_ORDERS');
      setOrders(result.orders || []);
      const nowIso = new Date().toISOString();
      setLastRefreshedAt(nowIso);
      saveSessionRefresh(DASHBOARD_ORDERS_REFRESH_KEY, nowIso);
    } catch (err) {
      console.error('[UI] Failed to load orders:', err);
      toast.error("שגיאה בטעינת ההזמנות");
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isDemo, request]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (user?.id) {
      setAssignedEmployeeId((prev) => prev || user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!canViewOthers || isDemo) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await request("GET_EMPLOYEES");
        if (cancelled) return;
        setEmployees(result.employees || []);
      } catch (err) {
        console.error("[UI] Failed to load employees:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [canViewOthers, isDemo, request]);

  useEffect(() => {
    if (paymentStatus !== "paid" && paymentStatus !== "paid_partial") {
      setPartialPaidAmount("");
    }
    if (paymentStatus !== "paid") {
      setHasCustomPaidAmount(false);
      setActualPaidAmount("");
    }
    if (paymentStatus === "paid" || paymentStatus === "paid_partial") {
      setCouponEnabled(false);
      setCouponMode("create");
      setSelectedStoreCoupon(null);
      setCouponValue("");
    }
  }, [paymentStatus]);

  useEffect(() => {
    if (paymentStatus !== "paid_partial") return;
    if (selectedProductsTotal <= 0) return;
    const numericPartial = Number(partialPaidAmount);
    if (Number.isFinite(numericPartial) && numericPartial >= selectedProductsTotal) {
      setPartialPaidAmount(String(Math.max(0, selectedProductsTotal - 1)));
    }
  }, [paymentStatus, partialPaidAmount, selectedProductsTotal]);

  useEffect(() => {
    if (selectedProductsTotal > 0) return;
    setPartialPaidAmount("");
  }, [selectedProductsTotal]);

  useEffect(() => {
    if (!canViewOthers || creatorOptions.length === 0) return;
    setSelectedCreatorKeys((prev) => {
      if (prev.size > 0) return prev;
      return new Set(creatorOptions.map((creator) => creator.id));
    });
  }, [canViewOthers, creatorOptions]);

  useEffect(() => {
    if (hasExclusiveProduct && paymentTag === "ביט") {
      setPaymentTag("");
    }
  }, [hasExclusiveProduct, paymentTag]);

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
    const nameParts = splitFullName(customerData.firstName);
    if (!nameParts) {
      showError("יש למלא שם מלא הכולל לפחות שם פרטי ושם משפחה");
      return;
    }
    const phoneTrim = allowNonIsraeliPhone
      ? String(customerData.phone || "").trim()
      : normalizeIsraeliPhone(customerData.phone);
    if (!phoneTrim) {
      showError("יש למלא מספר טלפון");
      return;
    }
    if (!allowNonIsraeliPhone) {
      if (!isValidIsraeliPhone(phoneTrim)) {
        showError("יש למלא מספר פלאפון ישראלי תקין שמתחיל ב-05 ומכיל 10 ספרות");
        return;
      }
    } else if (!isValidInternationalPhone(customerData.phone)) {
      showError("יש למלא מספר טלפון בינלאומי תקין (8–15 ספרות)");
      return;
    }
    if (!allowNonIsraeliPhone && customerData.phone !== phoneTrim) {
      setCustomerData((prev) => ({ ...prev, phone: phoneTrim }));
    }
    if (selectedProducts.length === 0) {
      showError("יש לבחור לפחות מוצר אחד");
      return;
    }
    const invalidPriceProduct = selectedProducts.find((p) => {
      const price = Number(p.price);
      return !Number.isFinite(price) || price < 0;
    });
    if (invalidPriceProduct) {
      showError(`מחיר לא תקין עבור המוצר "${invalidPriceProduct.name}" — חייב להיות 0 ומעלה`);
      return;
    }
    const total = selectedProductsTotal;
    if (total < 0) {
      showError("סכום ההזמנה לא יכול להיות שלילי");
      return;
    }
    if (total === 0 && paymentStatus !== "paid") {
      showError("מחיר ההזמנה חייב להיות גדול מ-0");
      return;
    }
    if (paymentStatus === "paid_partial") {
      const partialAmount = Number(partialPaidAmount);
      if (!String(partialPaidAmount).trim()) {
        showError("יש למלא כמה מתוך סכום ההזמנה כבר שולם");
        return;
      }
      if (!Number.isFinite(partialAmount) || partialAmount <= 0 || partialAmount >= total) {
        showError("הסכום ששולם חלקית חייב להיות גדול מ-0 וקטן מסכום ההזמנה");
        return;
      }
    }
    if ((paymentStatus === "paid" || paymentStatus === "paid_partial") && !paymentTag) {
      showError("יש לבחור אופן תשלום עבור הזמנה ששולמה");
      return;
    }
    if (paymentStatus === "paid" && hasCustomPaidAmount) {
      const actualAmount = Number(actualPaidAmount);
      if (!String(actualPaidAmount).trim()) {
        showError("יש למלא כמה שולם בפועל");
        return;
      }
      if (!Number.isFinite(actualAmount) || actualAmount <= 0) {
        showError("הסכום ששולם בפועל חייב להיות גדול מ-0");
        return;
      }
    }

    if (couponEnabled && paymentStatus === "unpaid") {
      if (couponMode === "existing") {
        if (!selectedStoreCoupon) {
          showError("נא לבחור קופון מהרשימה");
          return;
        }
      } else {
        const sub = selectedProducts.reduce((s, p) => s + (Number.isFinite(Number(p.price)) ? Number(p.price) : 0) * p.quantity, 0);
        if (!String(couponValue).trim()) {
          showError("נא למלא את הסכום לתשלום");
          return;
        }
        const customCoupon = parseCustomPayAmount(couponValue, sub);
        if (!customCoupon.isValid) {
          showError("הסכום לתשלום חייב להיות בין 0 לסכום ההזמנה");
          return;
        }
      }
    }

    setIsSubmitting(true);

    if (isDemo) {
      setTimeout(() => {
        resetForm();
        const demoRecordId = `demo-${Date.now()}`;
        const demoDynamicId = demoRecordId.replace(/\W/g, "").slice(0, 16) || "demodynamicdemo";
        setCreatedOrderState({
          recordId: demoRecordId,
          orderNumber: "",
          orderUrl: buildPublicOrderUrl(demoDynamicId),
          isDemo: true,
        });
        setIsSubmitting(false);
      }, 1500);
      return;
    }

    try {
      let coupon = null;
      let existingCoupon = null;
      if (couponEnabled && paymentStatus === "unpaid") {
        if (couponMode === "existing" && selectedStoreCoupon) {
          existingCoupon = { id: selectedStoreCoupon.id, code: selectedStoreCoupon.code };
        } else if (couponMode === "create") {
          coupon = { targetPayAmount: Number(couponValue) };
        }
      }

      const result = await request('CREATE_ORDER', {
        customer: {
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          phone: phoneTrim,
          contactId: null,
        },
        products: selectedProducts.map(p => ({
          id: p.id,
          name: p.name,
          price: Number.isFinite(Number(p.price)) ? Number(p.price) : 0,
          catalogPrice: Number.isFinite(Number(p.catalogPrice)) ? Number(p.catalogPrice) : Number(p.price) || 0,
          quantity: p.quantity,
          image: p.image,
        })),
        coupon,
        existingCoupon,
        notes,
        orderChanges,
        paymentStatus,
        paymentTag: paymentStatus === 'paid' || paymentStatus === "paid_partial" ? paymentTag : '',
        partialPayment: paymentStatus === "paid_partial"
          ? { amountPaid: Number(partialPaidAmount) }
          : null,
        actualPaidAmount: paymentStatus === "paid" && hasCustomPaidAmount
          ? Number(actualPaidAmount)
          : null,
        totalPrice: total,
        assignedEmployeeId: canViewOthers && assignedEmployeeId ? assignedEmployeeId : undefined,
      });

      console.log('[UI] Order created:', result.recordId, result.checkoutLink);
      const nextCreatedOrderState = {
        recordId: result.recordId,
        orderNumber: result.orderNumber || "",
        orderUrl: result.orderUrl || buildPublicOrderUrl(result.dynamicLinkId || ""),
        isDemo: false,
      };
      const partialInvoiceAmount = Number(partialPaidAmount);
      const partialInvoiceMethod = paymentTag;
      const shouldAutoGeneratePartialInvoice = (
        paymentStatus === "paid_partial" &&
        partialInvoiceMethod &&
        partialInvoiceMethod !== CARDCOM_PHONE_PAYMENT_METHOD &&
        partialInvoiceMethod !== STANDING_ORDER_PAYMENT_METHOD
      );
      resetForm();
      setCreatedOrderState(nextCreatedOrderState);
      if (shouldAutoGeneratePartialInvoice) {
        try {
          await request("GENERATE_PARTIAL_INVOICE", {
            recordId: result.recordId,
            amountPaid: partialInvoiceAmount,
            paymentMethod: partialInvoiceMethod,
          });
          toast.success("חשבונית הופקה ונשלחה ב-SMS ללקוח");
        } catch (invoiceErr) {
          console.error("[UI] Auto partial invoice failed:", invoiceErr);
          toast.error(invoiceErr.message || "שגיאה בהפקת חשבונית");
        }
      }
      loadOrders();
    } catch (err) {
      console.error('[UI] Create order failed:', err);
      toast.error(err.message || "שגיאה ביצירת ההזמנה");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerData({ firstName: "", lastName: "", phone: "" });
    setAllowNonIsraeliPhone(false);
    setSelectedProducts([]);
    setPaymentStatus("unpaid");
    setNotes("");
    setOrderChanges("");
    setPaymentTag("");
    setPartialPaidAmount("");
    setHasCustomPaidAmount(false);
    setActualPaidAmount("");
    setCouponEnabled(false);
    setCouponMode("create");
    setSelectedStoreCoupon(null);
    setCouponValue("");
    if (user?.id) {
      setAssignedEmployeeId(user.id);
    }
  };

  const handleConfirmOrderSend = async () => {
    if (!createdOrderState?.recordId) return;

    if (createdOrderState.isDemo) {
      toast.success("(מצב דמו) בקשת השליחה נשלחה. רענני את הרשימה כדי לראות עדכון וובהוק.", { duration: 4500 });
      setCreatedOrderState(null);
      return;
    }

    try {
      setIsConfirmingSend(true);
      await request("SEND_ORDER_WHATSAPP", { recordId: createdOrderState.recordId });
      toast.success("הודעת הוואטסאפ נשלחה. יש לרענן לקבל עדכון סטטוס.", { duration: 4500 });
      setCreatedOrderState(null);
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בשליחת פרטי ההזמנה");
    } finally {
      setIsConfirmingSend(false);
    }
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
      const nowIso = new Date().toISOString();
      setOrders(prev => prev.map(order => {
        if ((order.id || order._id) !== orderId) return order;
        const nextTimeline = [...(order.timeline || []), {
          type: "note",
          text: `נוספה הערה: ${noteText}`,
          by: user?.displayName ,
          actorType: "employee",
          date: nowIso,
        }];
        const nextOrderNotes = [...(order.orderNotes || []), {
          id: `demo-note-${Date.now()}`,
          text: noteText,
          by: user?.displayName,
          date: nowIso,
        }];
        return {
          ...order,
          timeline: nextTimeline,
          orderNotes: nextOrderNotes,
        };
      }));
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
      toast.success("(מצב דמו) בקשת השליחה החוזרת נשלחה");
      return;
    }
    try {
      await request('RESEND_ORDER_WHATSAPP', { recordId: orderId });
      toast.success("הודעת הוואטסאפ נשלחה מחדש. יש לרענן לקבל עדכון סטטוס.");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בשליחה חוזרת לוואטסאפ");
    }
  };

  const handleUpdateOrderStatus = async (orderId, status, options = {}) => {
    if (isDemo) {
      setOrders(prev => prev.map((o) => {
        if (o.id !== orderId && o._id !== orderId) return o;
        if (status !== "paid_partial") {
          return { ...o, status };
        }
        const subtotal = Math.max(0, Number(o.totalPrice ?? o.total ?? 0) || 0);
        const paidAmount = Number(options.partialPayment?.amountPaid || 0);
        return {
          ...o,
          status,
          paymentMethod: options.paymentTag || "",
          partialPaidAmount: paidAmount,
          couponDetails: JSON.stringify({
            source: "partial_paid",
            type: "fixed",
            value: paidAmount,
            paidAmount,
            remainingAmount: Math.max(0, subtotal - paidAmount),
          }),
        };
      }));
      toast.success("(מצב דמו) סטטוס ההזמנה עודכן");
      return;
    }
    try {
      await request('UPDATE_ORDER_STATUS', { recordId: orderId, status, ...options });
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

  const handleUpdateAssignment = async (recordId, newEmployeeId) => {
    if (isDemo) {
      toast.success("(מצב דמו) השיוך עודכן");
      return;
    }
    try {
      await request("UPDATE_ORDER_ASSIGNMENT", {
        recordId,
        assignedEmployeeId: newEmployeeId,
      });
      toast.success("שיוך ההזמנה עודכן");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בעדכון שיוך ההזמנה");
      throw err;
    }
  };

  const handleCompletePartialPayment = async (recordId, payload) => {
    if (isDemo) {
      toast.success("(מצב דמו) התשלום עודכן");
      return;
    }
    try {
      await request("COMPLETE_PARTIAL_PAYMENT", { recordId, ...payload });
      toast.success("התשלום עודכן בהצלחה");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בעדכון התשלום");
      throw err;
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

  const handleGenerateInvoice = async (orderId, { isSendByEmail, isSendSMS, force } = {}) => {
    if (isDemo) {
      toast.success("(מצב דמו) חשבונית הופקה");
      return { alreadyExists: false };
    }
    try {
      const result = await request("GENERATE_INVOICE", {
        recordId: orderId,
        isSendByEmail: !!isSendByEmail,
        isSendSMS: !!isSendSMS,
        force: !!force,
      });
      if (result.alreadyExists) {
        return result;
      }
      toast.success("חשבונית הופקה בהצלחה");
      loadOrders();
      return result;
    } catch (err) {
      toast.error(err.message || "שגיאה בהפקת חשבונית");
      throw err;
    }
  };

  const handleResendInvoice = async (orderId, docId, method) => {
    if (isDemo) {
      toast.success("(מצב דמו) חשבונית נשלחה מחדש");
      return;
    }
    try {
      await request("RESEND_INVOICE", { recordId: orderId, docId, method });
      toast.success("החשבונית נשלחה מחדש בהצלחה");
      loadOrders();
    } catch (err) {
      toast.error(err.message || "שגיאה בשליחה חוזרת של חשבונית");
    }
  };

  const handleCreateInvoiceFromTransaction = async (dealId, opts) => {
    if (isDemo) {
      toast.success("(מצב דמו) חשבונית הופקה מעסקה");
      return { alreadyExists: false };
    }
    try {
      const result = await request("CREATE_INVOICE_FROM_TRANSACTION", {
        dealId,
        isSendByEmail: !!opts?.isSendByEmail,
        isSendSMS: !!opts?.isSendSMS,
        force: !!opts?.force,
        dealAmount: Number(opts?.dealAmount) || 0,
        returnValue: opts?.returnValue || "",
        customerPhone: opts?.customerPhone || "",
      });
      if (result.alreadyExists) return result;
      const linkedMsg = result.savedToCms && result.linkedOrderNumber
        ? ` (נשמרה בהזמנה ${result.linkedOrderNumber})`
        : !result.savedToCms
          ? " (לא נשמרה בדאשבורד — אין הזמנה תואמת)"
          : "";
      toast.success(`חשבונית הופקה בהצלחה${linkedMsg}`);
      loadOrders();
      return result;
    } catch (err) {
      toast.error(err.message || "שגיאה בהפקת חשבונית מעסקה");
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]" dir="rtl" aria-busy={isSubmitting}>
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="presentation"
            aria-live="polite"
            aria-busy="true"
            className="fixed inset-0 z-[120] flex items-start justify-center pt-6 sm:pt-10 px-4 bg-slate-900/45 backdrop-blur-[2px] pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl border border-white/20 bg-white/95 px-8 py-7 text-center shadow-2xl max-w-md w-full"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
              </div>
              <p className="text-base font-semibold text-slate-900">יוצרים את ההזמנה</p>
              <p className="mt-1 text-sm text-slate-500">אנא המתן/י עד לסיום התהליך</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={Boolean(createdOrderState)}
        onOpenChange={(open) => {
          if (!open && !isConfirmingSend) setCreatedOrderState(null);
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-w-md top-4 left-[50%] z-[130] max-h-[min(90vh,calc(100dvh-1rem))] translate-x-[-50%] translate-y-0 overflow-y-auto sm:top-6 [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="text-right">
            <DialogTitle className="text-right">
              {createdOrderState?.orderNumber
                ? `ההזמנה ${createdOrderState.orderNumber} נוצרה בהצלחה`
                : "ההזמנה נוצרה בהצלחה"}
            </DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              ההזמנה נוצרה ונשמרה במערכת. פרטי ההזמנה עדיין לא נשלחו לוובהוק.
              רק לאחר לחיצה על אישור, הקישור יישלח ללקוח.
            </DialogDescription>
          </DialogHeader>

          {createdOrderState?.orderUrl && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <p className="mb-1 text-xs text-slate-400">הקישור שיישלח ללקוח</p>
              <p className="break-all text-xs text-slate-700" dir="ltr">{createdOrderState.orderUrl}</p>
            </div>
          )}


          <DialogFooter className="gap-2 sm:justify-start sm:space-x-0">
            <Button
              type="button"
              className="bg-[#30D46B] text-black hover:bg-[#28b85f] font-medium"
              onClick={handleConfirmOrderSend}
              disabled={isConfirmingSend}
            >
              {isConfirmingSend ? (
                <span className="flex items-center gap-2 text-black">
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  שולח...
                </span>
              ) : (
                "אישור ושליחה לוואטסאפ"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreatedOrderState(null)}
              disabled={isConfirmingSend}
            >
              סגירה ללא שליחה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-7xl mx-auto px-3 py-4 space-y-4 md:px-6 md:py-8 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between flex-wrap gap-2"
        >
          <div className="text-right">
            <h1 className="text-xl font-bold text-slate-900">ניהול הזמנות</h1>
            <p className="text-sm text-slate-400 mt-0.5">יצירת קישורי תשלום ומעקב הזמנות</p>
          </div>
          <div className="flex items-center gap-2">
            {canGenerateInvoices && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs font-medium"
                onClick={() => setShowTransactionPicker(true)}
              >
                <FileText className="w-4 h-4" />
                הפקת חשבונית
              </Button>
            )}
            {isDemo && (
              <div className="bg-amber-50 border border-amber-200 rounded-full px-4 py-2">
                <span className="text-xs text-amber-700 font-medium">מצב דמו - לא מחובר לוויקס</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Order Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-3 space-y-4 md:p-6 md:space-y-6"
        >
          <CustomerSection
            customerData={customerData}
            setCustomerData={setCustomerData}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            allowNonIsraeliPhone={allowNonIsraeliPhone}
            setAllowNonIsraeliPhone={setAllowNonIsraeliPhone}
          />

          {canViewOthers && employees.length > 0 && (
            <EmployeeAssignField
              employees={employees}
              value={assignedEmployeeId}
              onChange={setAssignedEmployeeId}
              disabled={isSubmitting}
            />
          )}

          <div className="border-t border-slate-100" />

          <ProductSelector
            isDemo={isDemo}
            selectedProducts={selectedProducts}
            setSelectedProducts={handleSetSelectedProducts}
          />

          {paymentStatus === "paid_partial" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.18 }}
              className="space-y-2"
            >
              <div className="rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-3 space-y-2">
                <Label className="block text-right text-sm font-medium text-slate-700">
                  כמה שולם כבר עבור ההזמנה
                </Label>
                <div className="flex items-center gap-2" dir="rtl">
                  <Input
                    type="number"
                    min="0"
                    max={Math.max(0, selectedProductsTotal - 0.01)}
                    step="0.01"
                    value={partialPaidAmount}
                    onChange={(e) => setPartialPaidAmount(e.target.value)}
                    placeholder="סכום ששולם"
                    className="h-10 text-right"
                    dir="ltr"
                    disabled={selectedProductsTotal <= 0}
                  />
                  <span className="text-sm font-semibold text-slate-600">₪</span>
                </div>
                {selectedProductsTotal <= 0 && (
                  <p className="text-xs text-orange-700">
                    יש לבחור קודם לפחות מוצר אחד כדי להזין סכום ששולם.
                  </p>
                )}
                {(() => {
                  if (selectedProductsTotal <= 0) return null;
                  const partialAmount = Number(partialPaidAmount);
                  if (!Number.isFinite(partialAmount) || partialAmount <= 0 || partialAmount >= selectedProductsTotal) {
                    return (
                      <p className="text-xs text-orange-700">
                        יש להזין סכום גדול מ-0 וקטן מ-₪{selectedProductsTotal.toLocaleString("he-IL")}
                      </p>
                    );
                  }
                  const remainingAmount = Math.max(0, selectedProductsTotal - partialAmount);
                  return (
                    <p className="text-xs text-orange-800">
                      שולם מראש: ₪{partialAmount.toLocaleString("he-IL")} | יתרה לשליחה בקישור: ₪{remainingAmount.toLocaleString("he-IL")}
                    </p>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {paymentStatus === "paid" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.2 }}
              className="space-y-2"
            >
              <button
                type="button"
                onClick={() => {
                  setHasCustomPaidAmount((prev) => {
                    const nextValue = !prev;
                    if (!nextValue) {
                      setActualPaidAmount("");
                    }
                    return nextValue;
                  });
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full ${
                  hasCustomPaidAmount
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                שולם סכום שונה
                <div className={`mr-auto w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  hasCustomPaidAmount ? "bg-emerald-600 border-emerald-600" : "border-slate-300"
                }`}>
                  {hasCustomPaidAmount && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
              </button>

              <AnimatePresence>
                {hasCustomPaidAmount && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 space-y-2">
                      <Label className="block text-right text-sm font-medium text-slate-700">
                        כמה שולם בפועל עבור ההזמנה
                      </Label>
                      <div className="flex items-center gap-2" dir="rtl">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={actualPaidAmount}
                          onChange={(e) => setActualPaidAmount(e.target.value)}
                          placeholder="סכום ששולם בפועל"
                          className="h-10 text-right"
                          dir="ltr"
                        />
                        <span className="text-sm font-semibold text-slate-600">₪</span>
                      </div>
                      {String(actualPaidAmount).trim() && (
                        Number.isFinite(Number(actualPaidAmount)) && Number(actualPaidAmount) > 0 ? (
                          <p className="text-xs text-emerald-800">
                            הערך יישמר בשדה "שולם בפועל" ויוצג בדאשבורד.
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-700">
                            יש להזין סכום גדול מ-0.
                          </p>
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {paymentStatus === "unpaid" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.22 }}
              className="space-y-2"
            >
              <button
                type="button"
                disabled={selectedProducts.reduce((s, p) => s + (Number.isFinite(Number(p.price)) ? Number(p.price) : 0) * p.quantity, 0) === 0}
                onClick={() => {
                  if (selectedProducts.reduce((s, p) => s + (Number.isFinite(Number(p.price)) ? Number(p.price) : 0) * p.quantity, 0) > 0) {
                    setCouponEnabled(!couponEnabled);
                    setCouponValue("");
                    setSelectedStoreCoupon(null);
                    setCouponMode("create");
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full ${
                  selectedProducts.reduce((s, p) => s + (Number.isFinite(Number(p.price)) ? Number(p.price) : 0) * p.quantity, 0) === 0
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
                    <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-4 space-y-2">
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
                          <div dir="rtl" className="flex w-full items-center justify-start gap-1.5 text-right">
                            <span className="text-xs font-medium text-slate-700">הסכום לתשלום</span>
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-sm font-bold text-violet-800"
                              aria-hidden
                            >
                              ₪
                            </span>
                          </div>
                          {(() => {
                            const total = selectedProducts.reduce((s, p) => s + (Number.isFinite(Number(p.price)) ? Number(p.price) : 0) * p.quantity, 0);
                            const customCoupon = parseCustomPayAmount(couponValue, total);
                            return (
                              <>
                                <div dir="rtl" className="flex w-full items-center justify-start gap-1.5">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={Math.max(0, total)}
                                    step="0.01"
                                    value={couponValue}
                                    onChange={(e) => setCouponValue(e.target.value)}
                                    placeholder="הסכום לתשלום"
                                    className="h-9 max-w-xs flex-1 text-sm border-slate-200 bg-white text-right"
                                    dir="rtl"
                                  />
                                  <span className="shrink-0 text-sm font-semibold text-slate-600 tabular-nums">₪</span>
                                </div>
                                {customCoupon.hasValue && !customCoupon.isValid && (
                                  <p className="text-xs text-red-500">
                                    הסכום לתשלום חייב להיות בין ₪0 ל-₪{total.toLocaleString("he-IL")}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </>
                      )}

                      {(() => {
                        const total = selectedProducts.reduce((s, p) => s + (Number.isFinite(Number(p.price)) ? Number(p.price) : 0) * p.quantity, 0);
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
                          const customCoupon = parseCustomPayAmount(couponValue, total);
                          if (!customCoupon.hasValue || !customCoupon.isValid) return null;
                          const discountAmount = customCoupon.discountAmount;
                          const discountedTotal = customCoupon.payAmount;
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
            {(paymentStatus === "paid" || paymentStatus === "paid_partial") && (
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
                    {["ביט", "פייבוקס", "הוראת קבע", "העברה בנקאית", "קארדקום טלפונית", "שולם דרך וויקס"]
                      .filter(tag => !(hasExclusiveProduct && tag === "ביט"))
                      .map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPaymentTag(paymentTag === tag ? "" : tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          paymentTag === tag
                            ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-white hover:text-slate-600 hover:border-slate-200"
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <Label className="text-sm font-medium text-slate-700">שינויים בערכה</Label>
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
                  יוצר הזמנה...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                 יצירת הזמנה
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Orders Table */}
        {canViewOthers && creatorOptions.length > 0 && (
          <EmployeeFilterField
            creatorOptions={creatorOptions}
            includeAllCreators={includeAllCreators}
            selectedCreatorKeys={selectedCreatorKeys}
            onIncludeAllChange={(checked) => {
              setIncludeAllCreators(checked);
              if (checked) {
                setSelectedCreatorKeys(new Set(creatorOptions.map((creator) => creator.id)));
              }
            }}
            onToggleCreator={(creatorId, checked) => {
              setIncludeAllCreators(false);
              setSelectedCreatorKeys((prev) => {
                const next = new Set(prev);
                if (checked) next.add(creatorId);
                else next.delete(creatorId);
                return next;
              });
            }}
          />
        )}

        <OrdersTable
          orders={visibleOrders}
          isLoading={isLoadingOrders}
          onRefresh={loadOrders}
          lastRefreshedAt={lastRefreshedAt}
          onCopyToClipboard={handleCopyToClipboard}
          onResendWhatsapp={handleResendWhatsapp}
          onUpdateStatus={handleUpdateOrderStatus}
          onDeleteOrder={handleDeleteOrder}
          onAddNote={handleAddNote}
          commissionRate={commissionRate ?? 0}
          canGenerateInvoices={canGenerateInvoices}
          onGenerateInvoice={handleGenerateInvoice}
          onResendInvoice={handleResendInvoice}
          canViewOthers={canViewOthers}
          employees={employees}
          onUpdateAssignment={handleUpdateAssignment}
          onCompletePartialPayment={handleCompletePartialPayment}
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

      <TransactionPickerDialog
        open={showTransactionPicker}
        onClose={() => setShowTransactionPicker(false)}
        onCreateInvoice={handleCreateInvoiceFromTransaction}
        request={request}
      />
    </div>
  );
}
