import React from "react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import { formatIsraeliPhoneInput, normalizeIsraeliPhone } from "@/utils/phoneUtils";

function PaymentStatusField({ paymentStatus, setPaymentStatus }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500 block text-right">סטטוס תשלום</Label>
      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
        <SelectTrigger className="h-10 text-sm border-slate-200 flex-row-reverse">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unpaid">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              לא שולם
            </div>
          </SelectItem>
          <SelectItem value="paid_partial">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              שולמה חלקית
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
    </div>
  );
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: "easeOut" }
};

/** מספר בינלאומי: אופציונלי + בתחילה ואז ספרות בלבד */
function sanitizeInternationalPhoneInput(value) {
  const s = String(value || "").trim();
  if (s.startsWith("+")) {
    return "+" + s.slice(1).replace(/\D/g, "").slice(0, 15);
  }
  return s.replace(/\D/g, "").slice(0, 15);
}

export default function CustomerSection({
  customerData,
  setCustomerData,
  paymentStatus,
  setPaymentStatus,
  allowNonIsraeliPhone,
  setAllowNonIsraeliPhone,
}) {
  const onPhoneChange = (raw) => {
    const v = allowNonIsraeliPhone ? sanitizeInternationalPhoneInput(raw) : formatIsraeliPhoneInput(raw);
    setCustomerData(prev => ({ ...prev, phone: v }));
  };

  const onPhoneBlur = () => {
    if (allowNonIsraeliPhone) return;
    setCustomerData((prev) => ({
      ...prev,
      phone: normalizeIsraeliPhone(prev.phone),
    }));
  };

  const onInternationalToggle = (checked) => {
    setAllowNonIsraeliPhone(checked);
    setCustomerData((prev) => ({
      ...prev,
      phone: checked
        ? sanitizeInternationalPhoneInput(prev.phone)
        : normalizeIsraeliPhone(prev.phone),
    }));
  };

  return (
    <motion.div {...fadeIn} className="space-y-5">
      <div className="flex items-center gap-3">
        <User className="w-[18px] h-[18px] text-slate-400" />
        <Label className="text-sm font-medium text-slate-700">פרטי לקוח</Label>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1.5 w-full" dir="rtl">
            <Label className="text-xs text-slate-500 block w-full text-right">
              טלפון<span className="text-red-400 mr-0.5">*</span>
            </Label>
            <Input
              id="customer-phone-new"
              value={customerData.phone}
              onChange={e => onPhoneChange(e.target.value)}
              onBlur={onPhoneBlur}
              placeholder={allowNonIsraeliPhone ? "+972..." : "05XXXXXXXX"}
              inputMode={allowNonIsraeliPhone ? "tel" : "numeric"}
              maxLength={allowNonIsraeliPhone ? 20 : 10}
              className="h-10 text-sm border-slate-200 focus:border-slate-400 text-right"
              dir="ltr"
            />
            <label
              dir="rtl"
              className="flex w-full cursor-pointer items-center justify-start gap-2 text-xs text-slate-600"
            >
              <span className="text-right">טלפון שאינו ישראלי</span>
              <Checkbox
                checked={allowNonIsraeliPhone}
                onCheckedChange={onInternationalToggle}
              />
            </label>
          </div>
          <PaymentStatusField paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus} />
          <div className="w-full min-w-0 space-y-1.5">
            <Label className="text-xs text-slate-500 block text-right">
              שם מלא<span className="text-red-400 mr-0.5">*</span>
            </Label>
            <Input
              value={customerData.firstName}
              onChange={e => setCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="שם פרטי ושם משפחה"
              className="h-10 w-full text-sm border-slate-200 focus:border-slate-400 text-right"
              dir="rtl"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
