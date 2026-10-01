import React from "react";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wallet } from "lucide-react";

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
 * מודול 1: בלוק ניהול מקדמה — מוצג רק כאשר paymentStatus === "awaiting_deposit"
 * (זמין רק לעובד/ת "טוני בדיקה" בשלב הפיתוח, נאכף גם בשרת).
 * אפשרויות הקורס והמשלוח מוצגות רק אחרי בחירת מוצרים, ורק אם יש מוצר רלוונטי (DeliveryRules).
 */
export default function DepositSection({
  totalPrice,
  depositAmount,
  setDepositAmount,
  depositLinkText,
  setDepositLinkText,
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
  const numericDeposit = Number(depositAmount);
  const isValid = Number.isFinite(numericDeposit) && numericDeposit > 0 && numericDeposit < totalPrice;
  const remaining = isValid ? Math.max(0, totalPrice - numericDeposit) : 0;
  const showOptions = hasProductsSelected && !isCheckingProducts;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      <div className="rounded-xl border border-yellow-200 bg-yellow-50/70 px-4 py-3 space-y-3" dir="rtl">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-yellow-700" />
          <Label className="text-sm font-medium text-slate-700">ניהול מקדמה</Label>
        </div>

        <div className="space-y-1.5">
          <Label className="block text-right text-sm font-medium text-slate-700">סכום המקדמה</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max={Math.max(0, totalPrice - 0.01)}
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="סכום המקדמה"
              className="h-10 text-right"
              dir="ltr"
            />
            <span className="text-sm font-semibold text-slate-600">₪</span>
          </div>
          {!isValid ? (
            <p className="text-xs text-yellow-800">
              יש להזין סכום גדול מ-0 וקטן מסך ההזמנה (₪{totalPrice.toLocaleString("he-IL")})
            </p>
          ) : (
            <p className="text-xs text-yellow-800">
              יתרה לתשלום לאחר המקדמה: ₪{remaining.toLocaleString("he-IL")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="block text-right text-sm font-medium text-slate-700">
            טקסט מותאם לדף התשלום ולקבלה (עברית)
          </Label>
          <Textarea
            value={depositLinkText}
            onChange={(e) => setDepositLinkText(e.target.value)}
            placeholder="לדוגמה: מקדמה עבור סדנת..."
            className="min-h-[60px] text-sm border-yellow-200 focus:border-yellow-400 resize-none"
            dir="rtl"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="block text-right text-sm font-medium text-slate-700">
            תאריך יעד לתשלום המקדמה
          </Label>
          <Input
            type="date"
            value={balanceDueDate}
            onChange={(e) => setBalanceDueDate(e.target.value)}
            className="h-10 text-right"
            dir="ltr"
          />
        </div>

        {hasProductsSelected && isCheckingProducts && (
          <p className="text-xs text-slate-500">בודק אפשרויות לפי המוצרים שנבחרו...</p>
        )}

        {showOptions && hasProgram && (
          <CheckOption
            checked={unlockProgram}
            onToggle={() => setUnlockProgram(!unlockProgram)}
            label="פתיחת הקורס/תוכנית הדיגיטלית באופן אוטומטי לאחר תשלום מלא"
            checkedClass="bg-emerald-50 border-emerald-300 text-emerald-700"
          />
        )}

        {showOptions && hasShipping && (
          <CheckOption
            checked={shipAfterDeposit}
            onToggle={() => setShipAfterDeposit(!shipAfterDeposit)}
            label="שליחת ההזמנה לאחר תשלום המקדמה"
            checkedClass="bg-emerald-50 border-emerald-300 text-emerald-700"
          />
        )}
      </div>
    </motion.div>
  );
}
