import React from "react";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarClock } from "lucide-react";

function CheckOption({ checked, onToggle, label, checkedClass }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full ${
        checked ? checkedClass : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
      }`}
    >
      {label}
      <div className={`mr-auto w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
        checked ? "bg-emerald-600 border-emerald-600" : "border-slate-300"
      }`}>
        {checked && <div className="w-2 h-2 bg-white rounded-sm" />}
      </div>
    </button>
  );
}

/**
 * מודול 1: תאריך יעד ואפשרויות פתיחת קורס/שליחת ערכה — עבור הזמנות "שולמה חלקית".
 * כשאחת האפשרויות מסומנת, הלקוחה תקבל קודם קישור ללא תשלום (0 ₪) להשלמת פרטים בלבד,
 * ולאחר מכן קישור נפרד לתשלום היתרה (ראו backend/dashboardApi.jsw — requestedDeposit.prepaid).
 */
export default function PrepaidOptionsSection({
  balanceDueDate,
  setBalanceDueDate,
  hasProductsSelected,
  isCheckingProducts,
  hasProgram,
  hasShipping,
  unlockProgram,
  setUnlockProgram,
  shipAfterDeposit,
  setShipAfterDeposit,
}) {
  const showOptions = hasProductsSelected && !isCheckingProducts;
  const prepaidOptionChecked = (hasProgram && unlockProgram) || (hasShipping && shipAfterDeposit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      <div className="rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-3 space-y-3" dir="rtl">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-orange-700" />
          <Label className="text-sm font-medium text-slate-700">תאריך יעד ואפשרויות נוספות</Label>
        </div>

        <div className="space-y-1.5">
          <Label className="block text-right text-sm font-medium text-slate-700">
            תאריך יעד להשלמת התשלום (אופציונלי)
          </Label>
          <Input
            type="date"
            value={balanceDueDate}
            onChange={(e) => setBalanceDueDate(e.target.value)}
            className="h-10 text-right"
            dir="ltr"
          />
        </div>

        {!hasProductsSelected && (
          <p className="text-xs text-slate-500">
            אחרי בחירת מוצר יופיעו כאן אפשרויות לפתיחת קורס או שליחת ערכה, אם יש כאלה במוצר.
          </p>
        )}

        {hasProductsSelected && isCheckingProducts && (
          <p className="text-xs text-slate-500">בודק אפשרויות לפי המוצרים שנבחרו...</p>
        )}

        {showOptions && !hasProgram && !hasShipping && (
          <p className="text-xs text-slate-500">למוצרים שנבחרו אין קורס מחובר או ערכה למשלוח.</p>
        )}

        {showOptions && hasProgram && (
          <CheckOption
            checked={unlockProgram}
            onToggle={() => setUnlockProgram(!unlockProgram)}
            label="פתיחת הקורס/תוכנית הדיגיטלית"
            checkedClass="bg-emerald-50 border-emerald-300 text-emerald-700"
          />
        )}

        {showOptions && hasShipping && (
          <CheckOption
            checked={shipAfterDeposit}
            onToggle={() => setShipAfterDeposit(!shipAfterDeposit)}
            label="שליחת הערכה"
            checkedClass="bg-emerald-50 border-emerald-300 text-emerald-700"
          />
        )}

        {prepaidOptionChecked && (
          <p className="text-xs text-orange-800 bg-orange-100/70 rounded-lg px-3 py-2">
            הלקוחה תקבל קישור ראשון ללא תשלום (0 ₪) להשלמת פרטים בלבד, כדי שהקורס/הערכה יופעלו לפי הסכום שכבר שולם.
            לאחר מכן יישלח אליה קישור נפרד לתשלום היתרה — ולא תבוצע שליחה או שיוך כפול.
          </p>
        )}
      </div>
    </motion.div>
  );
}
