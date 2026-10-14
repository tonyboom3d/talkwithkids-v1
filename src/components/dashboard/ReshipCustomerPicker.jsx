import React, { useState, useEffect, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Search, UserPlus, MapPin, X } from "lucide-react";
import { LoadingSpinner } from "./LoadingSkeleton";
import { usePostMessage } from "@/hooks/usePostMessage";
import { formatIsraeliPhoneInput, normalizeIsraeliPhone } from "@/utils/phoneUtils";

const EMPTY_ADDRESS = { street: "", houseNumber: "", apt: "", city: "", zipCode: "" };

/**
 * חיפוש/יצירת לקוח למשלוח חוזר: חיפוש אוטומטי (שם/טלפון/מייל) מתוך אנשי קשר קיימים,
 * עם אפשרות תמידית ליצירת לקוח חדש (שם מלא + טלפון + כתובת מלאה).
 */
export default function ReshipCustomerPicker({ isDemo, customer, setCustomer }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);
  const { request } = usePostMessage();

  const hasSelected = !!(customer.contactId || customer.isNew);

  const runSearch = useCallback(async (q) => {
    if (isDemo) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const result = await request("SEARCH_RESHIP_CUSTOMERS", { query: q });
      setResults(result.customers || []);
    } catch (err) {
      console.error("[UI] Failed to search reship customers:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [isDemo, request]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      runSearch(query.trim());
      setShowResults(true);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const selectCustomer = (c) => {
    setCustomer({
      contactId: c.id,
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      phone: normalizeIsraeliPhone(c.phone) || c.phone || "",
      email: c.email || "",
      address: {
        street: c.address?.street || "",
        houseNumber: c.address?.houseNumber || "",
        apt: c.address?.apt || "",
        city: c.address?.city || "",
        zipCode: c.address?.zipCode || "",
      },
      isNew: false,
    });
    setShowResults(false);
    setQuery(`${c.firstName || ""} ${c.lastName || ""}`.trim());
  };

  const startNewCustomer = () => {
    setCustomer({
      contactId: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: { ...EMPTY_ADDRESS },
      isNew: true,
    });
    setShowResults(false);
  };

  const clearSelection = () => {
    setCustomer({
      contactId: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: { ...EMPTY_ADDRESS },
      isNew: false,
    });
    setQuery("");
  };

  const updateField = (field, value) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddressField = (field, value) => {
    setCustomer((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <User className="w-[18px] h-[18px] text-slate-400" />
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          לקוח
          <span className="text-red-400">*</span>
        </Label>
      </div>

      {!hasSelected && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם, טלפון או מייל..."
              className="pr-10 h-10 text-sm border-slate-200 text-right"
              dir="rtl"
            />
          </div>

          {showResults && (
            <div className="absolute z-30 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              <div className="max-h-56 overflow-y-auto" dir="rtl">
                {isSearching ? (
                  <LoadingSpinner text="מחפש לקוחות..." />
                ) : results.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">לא נמצאו לקוחות תואמים</div>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full px-4 py-2.5 text-right transition-colors border-b border-slate-50 last:border-0 hover:bg-slate-50"
                    >
                      <div className="text-sm font-medium text-slate-800">{`${c.firstName || ""} ${c.lastName || ""}`.trim() || "ללא שם"}</div>
                      <div className="text-xs text-slate-500 tabular-nums" dir="ltr">
                        {[c.phone, c.email].filter(Boolean).join(" · ")}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={startNewCustomer} className="gap-1.5 text-xs">
              <UserPlus className="w-3.5 h-3.5" />
              לקוח חדש
            </Button>
          </div>
        </div>
      )}

      {hasSelected && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3" dir="rtl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {customer.isNew ? "לקוח חדש" : "לקוח קיים נבחר"}
            </span>
            <button type="button" onClick={clearSelection} className="text-slate-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">שם מלא</Label>
              <Input
                value={`${customer.firstName}${customer.lastName ? " " + customer.lastName : ""}`}
                onChange={(e) => {
                  const parts = e.target.value.trim().split(/\s+/);
                  updateField("firstName", parts[0] || "");
                  updateField("lastName", parts.slice(1).join(" "));
                }}
                disabled={!customer.isNew}
                className="h-9 text-sm text-right"
                dir="rtl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">טלפון</Label>
              <Input
                value={customer.phone}
                onChange={(e) => updateField("phone", formatIsraeliPhoneInput(e.target.value))}
                disabled={!customer.isNew}
                placeholder="05XXXXXXXX"
                className="h-9 text-sm text-right"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-200/70">
            <div className="flex items-center gap-1.5 pt-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <Label className="text-xs font-medium text-slate-600">כתובת למשלוח</Label>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input
                value={customer.address.street}
                onChange={(e) => updateAddressField("street", e.target.value)}
                placeholder="רחוב"
                className="h-9 text-sm text-right col-span-2 sm:col-span-1"
                dir="rtl"
              />
              <Input
                value={customer.address.houseNumber}
                onChange={(e) => updateAddressField("houseNumber", e.target.value)}
                placeholder="מספר בית"
                className="h-9 text-sm text-right"
                dir="rtl"
              />
              <Input
                value={customer.address.apt}
                onChange={(e) => updateAddressField("apt", e.target.value)}
                placeholder="דירה (אופציונלי)"
                className="h-9 text-sm text-right"
                dir="rtl"
              />
              <Input
                value={customer.address.city}
                onChange={(e) => updateAddressField("city", e.target.value)}
                placeholder="עיר"
                className="h-9 text-sm text-right"
                dir="rtl"
              />
            </div>
            <Input
              value={customer.address.zipCode}
              onChange={(e) => updateAddressField("zipCode", e.target.value)}
              placeholder="מיקוד (אופציונלי)"
              className="h-9 text-sm text-right w-full sm:w-1/2"
              dir="rtl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
