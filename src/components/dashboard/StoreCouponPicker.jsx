import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, Ticket, X } from "lucide-react";
import { LoadingSpinner } from "./LoadingSkeleton";
import { DEMO_STORE_COUPONS } from "./DemoDataProvider";
import { usePostMessage } from "@/hooks/usePostMessage";

export default function StoreCouponPicker({ isDemo, selectedCoupon, onSelect, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { request } = usePostMessage();

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (isDemo) {
      const q = searchQuery.trim().toLowerCase();
      const filtered = DEMO_STORE_COUPONS.filter(
        (c) =>
          !q ||
          (c.name || "").toLowerCase().includes(q) ||
          (c.code || "").toLowerCase().includes(q)
      );
      setCoupons(filtered);
      return;
    }

    setIsLoading(true);
    const t = setTimeout(async () => {
      try {
        const result = await request("SEARCH_COUPONS", { query: searchQuery });
        const list =
          result?.coupons ??
          result?.data?.coupons ??
          (Array.isArray(result) ? result : null);
        setCoupons(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("[UI] Coupon search failed:", err);
        setCoupons([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, isOpen, isDemo, request]);

  const pick = (c) => {
    onSelect(c);
    setIsOpen(false);
    setSearchQuery("");
  };

  const clear = () => {
    onSelect(null);
    setSearchQuery("");
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          dir="rtl"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="w-full h-11 px-4 flex items-center justify-between gap-2 rounded-lg border border-violet-200 bg-white hover:border-violet-300 transition-colors text-base disabled:opacity-50"
        >
          <span className="text-slate-600 text-right flex-1 min-w-0 truncate">
            {selectedCoupon ? (
              <span className="font-medium text-violet-800 truncate">
                {selectedCoupon.name || selectedCoupon.code}{" "}
                <span className="text-slate-500 font-normal">({selectedCoupon.code})</span>
                {selectedCoupon.discountValueText && (
                  <span className="text-slate-600 font-normal mr-1"> · {selectedCoupon.discountValueText}</span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">חיפוש קופון לפי שם או קוד...</span>
            )}
          </span>
          <Ticket className="w-4 h-4 text-violet-400 shrink-0" />
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {selectedCoupon && (
          <button
            type="button"
            onClick={clear}
            className="absolute left-10 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
            aria-label="נקה בחירה"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute z-[100] top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            >
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="שם קופון או קוד..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 h-9 text-base border-slate-200"
                    dir="rtl"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {isLoading ? (
                  <LoadingSpinner text="טוען קופונים..." />
                ) : coupons.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">לא נמצאו קופונים (חנות)</div>
                ) : (
                  coupons.map((c, idx) => (
                    <button
                      key={String(c.id ?? c._id ?? c.code ?? `c-${idx}`)}
                      type="button"
                      dir="rtl"
                      onClick={() => pick(c)}
                      className="w-full px-4 py-3 flex flex-col items-stretch gap-1.5 text-right border-b border-slate-50 last:border-0 hover:bg-violet-50/60 transition-colors"
                    >
                      <div className="flex items-center justify-start gap-2">
                        <span className="text-base font-medium text-slate-800 truncate flex-1 min-w-0">{c.name || c.code}</span>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {c.code}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 justify-end">
                        <span className="text-violet-700 font-medium">{c.discountTypeLabel || "סוג קופון"}</span>
                        <span className="text-slate-400">·</span>
                        <span className="tabular-nums font-semibold text-slate-800">
                          {c.discountValueText ?? "—"}
                        </span>
                      </div>
                      {c.rulesSummary && (
                        <span className="text-[11px] text-slate-500 leading-snug border-t border-slate-100 pt-1.5">
                          {c.rulesSummary}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-xs text-slate-500 text-right">
        רק קופונים פעילים ל<strong>חנות</strong> (stores). ניתן לבחור קופון אחד בלבד — או ליצור קופון חדש, לא שניהם.
      </p>
    </div>
  );
}
