import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, MessageSquare, History } from "lucide-react";
import ReshipProductPicker from "./ReshipProductPicker";
import ReshipCustomerPicker from "./ReshipCustomerPicker";
import { usePostMessage } from "@/hooks/usePostMessage";
import { isValidIsraeliPhone, normalizeIsraeliPhone } from "@/utils/phoneUtils";

const EMPTY_CUSTOMER = {
  contactId: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: { street: "", houseNumber: "", apt: "", city: "", zipCode: "" },
  isNew: false,
};

/**
 * יצירת הזמנת "משלוח חוזר" — 0 ש״ח, ללא חשבונית, משלוח תפוז בלבד.
 * מיועד לבעלת האתר/עובדות מורשות להפיק הזמנה חדשה כשמשלוח קודם לא הגיע ללקוחה.
 */
export default function ReshipDialog({ open, onClose, isDemo, onSubmit }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [customer, setCustomer] = useState({ ...EMPTY_CUSTOMER });
  const [reason, setReason] = useState("");
  const [markPaid, setMarkPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [pastOrders, setPastOrders] = useState([]);
  const [addNoteToPastOrderId, setAddNoteToPastOrderId] = useState("");
  const { request } = usePostMessage();

  const resetForm = useCallback(() => {
    setSelectedProducts([]);
    setCustomer({ ...EMPTY_CUSTOMER });
    setReason("");
    setMarkPaid(false);
    setValidationError("");
    setPastOrders([]);
    setAddNoteToPastOrderId("");
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  // זיהוי הזמנות עבר של הלקוח/ה — מוצע אוטומטית להוסיף הערה בהזמנה הקיימת
  useEffect(() => {
    const normalizedPhone = normalizeIsraeliPhone(customer.phone);
    if (isDemo || !normalizedPhone || !isValidIsraeliPhone(normalizedPhone)) {
      setPastOrders([]);
      setAddNoteToPastOrderId("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await request("GET_CUSTOMER_PAST_ORDERS", { phone: normalizedPhone });
        if (cancelled) return;
        const orders = result.orders || [];
        setPastOrders(orders);
        setAddNoteToPastOrderId(orders.length > 0 ? orders[0].recordId : "");
      } catch (err) {
        if (!cancelled) {
          console.error("[UI] Failed to load customer past orders:", err);
          setPastOrders([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [customer.phone, isDemo, request]);

  const showError = (msg) => {
    setValidationError(msg);
    setTimeout(() => setValidationError(""), 3700);
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      showError("יש לבחור לפחות מוצר אחד למשלוח");
      return;
    }
    if (!customer.contactId && !customer.isNew) {
      showError("יש לבחור לקוח קיים או ליצור לקוח חדש");
      return;
    }
    if (!customer.firstName.trim()) {
      showError("יש למלא שם לקוח");
      return;
    }
    const normalizedPhone = normalizeIsraeliPhone(customer.phone);
    if (!normalizedPhone || !isValidIsraeliPhone(normalizedPhone)) {
      showError("יש למלא מספר פלאפון ישראלי תקין");
      return;
    }
    if (!customer.address.street.trim() || !customer.address.houseNumber.trim() || !customer.address.city.trim()) {
      showError("יש למלא כתובת מלאה (רחוב, מספר בית ועיר)");
      return;
    }
    if (!reason.trim()) {
      showError("יש למלא הערה עם סיבת יציאת המשלוח");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        customer: {
          contactId: customer.contactId || null,
          firstName: customer.firstName.trim(),
          lastName: customer.lastName.trim(),
          phone: normalizedPhone,
          email: customer.email.trim(),
          address: customer.address,
        },
        products: selectedProducts.map((p) => ({ id: p.id, name: p.name, quantity: p.quantity })),
        reason: reason.trim(),
        markPaid,
        addNoteToPastOrderId: addNoteToPastOrderId || null,
      });
      resetForm();
      onClose();
    } catch (err) {
      showError(err?.message || "שגיאה ביצירת הזמנת המשלוח החוזר");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isSubmitting) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[min(92vh,calc(100dvh-2rem))] overflow-y-auto">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">יצירת הזמנה — משלוח חוזר</DialogTitle>
          <DialogDescription className="text-right leading-relaxed">
            הזמנה חדשה ללא עלות וללא חשבונית, תצא כמשלוח תפוז בלבד. מיועד למקרה שהמשלוח המקורי לא סופק ללקוחה.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <ReshipProductPicker
            isDemo={isDemo}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />

          <div className="border-t border-slate-100" />

          <ReshipCustomerPicker isDemo={isDemo} customer={customer} setCustomer={setCustomer} />

          <AnimatePresence>
            {pastOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 space-y-2" dir="rtl">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
                    <History className="w-3.5 h-3.5" />
                    נמצאו הזמנות קודמות ללקוח/ה זה/ו
                  </div>
                  <label className="flex items-start gap-2 text-xs text-amber-900 cursor-pointer">
                    <Checkbox
                      checked={!!addNoteToPastOrderId}
                      onCheckedChange={(checked) => setAddNoteToPastOrderId(checked ? pastOrders[0].recordId : "")}
                      className="mt-0.5"
                    />
                    <span>
                      להוסיף הערה בהזמנה הקיימת ({pastOrders[0].orderNumber || "ללא מספר"}) שנשלחה הזמנה נוספת, עם מספר ההזמנה החדשה
                    </span>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-[18px] h-[18px] text-slate-400" />
              <Label className="text-sm font-medium text-slate-700">
                הערות להזמנה (סיבת יציאת המשלוח)
                <span className="text-red-400 mr-0.5">*</span>
              </Label>
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="לדוגמה: המשלוח המקורי לא הגיע ללקוחה..."
              className="min-h-[70px] text-sm border-slate-200 focus:border-slate-400 resize-none"
              dir="rtl"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <Checkbox checked={markPaid} onCheckedChange={setMarkPaid} />
            סמן הזמנה כ"שולמה" (ללא חשבונית, סכום ההזמנה 0 ₪)
          </label>

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
        </div>

        <DialogFooter className="gap-2 sm:justify-start sm:space-x-0">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#30D46B] text-black hover:bg-[#28b85f] font-medium"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 text-black">
                <Loader2 className="h-4 w-4 animate-spin" />
                יוצר הזמנה...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                יצירת הזמנה
              </span>
            )}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
