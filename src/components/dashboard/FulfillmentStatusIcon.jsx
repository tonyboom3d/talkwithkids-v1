import React from "react";
import { Check, X, Minus } from "lucide-react";

/**
 * אייקון מצב מילוי (תוכנית / משלוח): "yes" = V ירוק, "no" = X אדום, "na"/else = "—" אפור.
 */
export default function FulfillmentStatusIcon({ status, className = "", size = "w-3.5 h-3.5" }) {
  if (status === "yes") {
    return (
      <span className={`inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 p-0.5 ${className}`}>
        <Check className={size} strokeWidth={3} />
      </span>
    );
  }
  if (status === "no") {
    return (
      <span className={`inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 p-0.5 ${className}`}>
        <X className={size} strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center justify-center text-slate-300 ${className}`}>
      <Minus className={size} />
    </span>
  );
}
