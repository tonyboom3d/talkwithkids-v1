import React from "react";
import { Check, X, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * אייקון מצב מילוי (תוכנית / משלוח): "yes" = V ירוק, "no" = X אדום, "na"/else = "—" אפור.
 * tooltip מוצג רק על V.
 */
export default function FulfillmentStatusIcon({ status, tooltip = "", className = "", size = "w-4 h-4" }) {
  const icon = status === "yes" ? (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ${className}`}>
      <Check className={size} strokeWidth={3} />
    </span>
  ) : status === "no" ? (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 ${className}`}>
      <X className={size} strokeWidth={3} />
    </span>
  ) : (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 ${className}`}>
      <Minus className={size} strokeWidth={3} />
    </span>
  );

  if (status !== "yes" || !String(tooltip || "").trim()) return icon;

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex" onClick={(event) => event.stopPropagation()}>{icon}</span>
        </TooltipTrigger>
        <TooltipContent side="top" dir="rtl">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
