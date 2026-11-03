import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * תוכן "מוצרים" — משותף לתצוגת האקורדיון (מחשב) ולכרטיס המאוחד (נייד).
 */
export default function OrderProductsList({ order }) {
  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-2">
        {order.products.length > 0 ? order.products.map((product, index) => {
          const productImage = String(product.image || product.imageUrl || "").trim();
          const lineTotal = Number((product.price || 0) * (product.quantity || 0));
          return (
            <div key={`${order.rowId}-product-${index}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5">
              <div className="flex items-center justify-between gap-2 md:gap-3" dir="rtl">
                <div className="flex min-w-0 items-center justify-end gap-1.5 md:gap-2 text-right">
                  <div className="min-w-0 text-right" dir="rtl">
                    <p className="truncate text-xs md:text-sm text-slate-700">{product.name || "מוצר"}</p>
                    <p className="text-[10px] md:text-xs text-slate-400">כמות: {product.quantity || 1}</p>
                  </div>
                  {productImage && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                          aria-label={`תצוגה מוגדלת למוצר ${product.name || ""}`}
                        >
                          <img
                            src={productImage}
                            alt={product.name || "תמונת מוצר"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="border border-slate-200 bg-white p-1.5 shadow-lg">
                        <img
                          src={productImage}
                          alt={product.name || "תצוגה מוגדלת"}
                          className="h-40 w-40 rounded-md object-cover"
                        />
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <span className="shrink-0 text-xs md:text-sm font-semibold text-slate-700">
                  {lineTotal.toLocaleString("he-IL")} ש"ח
                </span>
              </div>
            </div>
          );
        }) : (
          <p className="text-xs text-slate-400 text-right">אין פרטי מוצרים להצגה</p>
        )}
      </div>
    </TooltipProvider>
  );
}
