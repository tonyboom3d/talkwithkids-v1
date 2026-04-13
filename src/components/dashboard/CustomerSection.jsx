import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle, Pencil, Phone, User } from "lucide-react";
import { LoadingSpinner } from "./LoadingSkeleton";
import { DEMO_CUSTOMERS } from "./DemoDataProvider";
import { usePostMessage } from "@/hooks/usePostMessage";

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
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: "easeOut" }
};

function sanitizeIsraeliPhoneInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

/** מספר בינלאומי: אופציונלי + בתחילה ואז ספרות בלבד */
function sanitizeInternationalPhoneInput(value) {
  const s = String(value || "").trim();
  if (s.startsWith("+")) {
    return "+" + s.slice(1).replace(/\D/g, "").slice(0, 15);
  }
  return s.replace(/\D/g, "").slice(0, 15);
}

export default function CustomerSection({
  isDemo,
  customerData,
  setCustomerData,
  paymentStatus,
  setPaymentStatus,
  selectedContact,
  setSelectedContact,
  allowNonIsraeliPhone,
  setAllowNonIsraeliPhone,
}) {
  const [isExisting, setIsExisting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { request } = usePostMessage();

  useEffect(() => {
    if (!searchQuery.trim() || !isExisting) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    if (isDemo) {
      const timer = setTimeout(() => {
        const filtered = DEMO_CUSTOMERS.filter(c =>
          `${c.firstName} ${c.lastName}`.includes(searchQuery) ||
          c.phone.includes(searchQuery)
        );
        setSearchResults(filtered);
        setIsSearching(false);
      }, 800);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      try {
        const result = await request('SEARCH_CONTACTS', { query: searchQuery });
        const list = result?.contacts ?? result?.data?.contacts;
        setSearchResults(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('[UI] Contact search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, isExisting, isDemo, request]);

  const handleSelectCustomer = (customer) => {
    setSelectedContact(customer);
    const full = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
    setCustomerData({
      firstName: full,
      lastName: "",
      phone: allowNonIsraeliPhone
        ? sanitizeInternationalPhoneInput(String(customer.phone || ""))
        : sanitizeIsraeliPhoneInput(String(customer.phone || "")),
    });
    setShowResults(false);
    setSearchQuery("");
    setIsEditing(false);
  };

  const handleToggle = (checked) => {
    setIsExisting(checked);
    setSelectedContact(null);
    setIsEditing(false);
    setSearchQuery("");
    setAllowNonIsraeliPhone(false);
    if (!checked) {
      setCustomerData({ firstName: "", lastName: "", phone: "" });
    }
  };

  const handleFieldChange = (field, value) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  const onPhoneChange = (raw) => {
    const v = allowNonIsraeliPhone ? sanitizeInternationalPhoneInput(raw) : sanitizeIsraeliPhoneInput(raw);
    setCustomerData(prev => ({ ...prev, phone: v }));
  };

  const onInternationalToggle = (checked) => {
    setAllowNonIsraeliPhone(checked);
    setCustomerData((prev) => ({
      ...prev,
      phone: checked
        ? sanitizeInternationalPhoneInput(prev.phone)
        : sanitizeIsraeliPhoneInput(prev.phone),
    }));
  };

  return (
    <motion.div {...fadeIn} className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="w-[18px] h-[18px] text-slate-400" />
          <Label className="text-sm font-medium text-slate-700">פרטי לקוח</Label>
        </div>
        <div className="flex items-center gap-3" dir="ltr">
          <span className={`text-xs transition-colors ${isExisting ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>לקוח קיים</span>
          <Switch checked={isExisting} onCheckedChange={handleToggle} />
          <span className={`text-xs transition-colors ${!isExisting ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>לקוח חדש</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isExisting ? (
          <motion.div key="existing" {...fadeIn} className="space-y-4">
            {!selectedContact && (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי שם או טלפון..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 text-sm h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400/20"
                  dir="rtl"
                />

                <AnimatePresence>
                  {showResults && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                    >
                      {isSearching ? (
                        <LoadingSpinner text="מחפש לקוחות..." />
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">לא נמצאו תוצאות</div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto">
                          {searchResults.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-right border-b border-slate-50 last:border-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-slate-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-700">{c.firstName} {c.lastName}</div>
                                <div className="text-xs text-slate-400 truncate">{c.phone || "—"}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {selectedContact && !isEditing && (
              <motion.div {...fadeIn} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-slate-500 hover:text-slate-700 gap-1.5 h-8 text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    ערוך
                  </Button>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-800">{customerData.firstName}</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-right">
                  {customerData.phone ? (
                    <div className="flex items-center gap-2 justify-end text-xs text-slate-500">
                      <span dir="ltr">{customerData.phone}</span>
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[11px] gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        חסר מספר טלפון
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200/60">
                  <button
                    onClick={() => { setSelectedContact(null); setSearchQuery(""); }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    בחר לקוח אחר \u2190
                  </button>
                </div>
              </motion.div>
            )}

            {selectedContact && isEditing && (
              <motion.div {...fadeIn} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1.5 w-full" dir="rtl">
                    <Label className="text-xs text-slate-500 block w-full text-right">
                      טלפון<span className="text-red-400 mr-0.5">*</span>
                    </Label>
                    <Input
                      value={customerData.phone}
                      onChange={e => onPhoneChange(e.target.value)}
                      placeholder={allowNonIsraeliPhone ? "+972..." : "05XXXXXXXX"}
                      inputMode={allowNonIsraeliPhone ? "tel" : "numeric"}
                      maxLength={allowNonIsraeliPhone ? 20 : 10}
                      className="h-10 text-sm border-slate-200 text-right"
                      dir="ltr"
                    />
                    <label
                      dir="rtl"
                      className="mt-1 flex w-full cursor-pointer items-center justify-start gap-2 text-xs text-slate-600"
                    >
                      <span className="text-right">טלפון שאינו ישראלי</span>
                      <Checkbox
                        checked={allowNonIsraeliPhone}
                        onCheckedChange={onInternationalToggle}
                      />
                    </label>
                  </div>
                  <PaymentStatusField paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus} />
                  <div className="space-y-1.5 w-full min-w-0">
                    <Label className="text-xs text-slate-500 block text-right">
                      שם מלא<span className="text-red-400 mr-0.5">*</span>
                    </Label>
                    <Input
                      value={customerData.firstName}
                      onChange={e => handleFieldChange("firstName", e.target.value)}
                      placeholder="שם פרטי ושם משפחה"
                      className="h-10 w-full text-sm border-slate-200 text-right"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-xs h-8">ביטול</Button>
                  <Button size="sm" onClick={() => setIsEditing(false)} className="text-xs h-8 bg-slate-800 hover:bg-slate-700 text-white">שמור</Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="new" {...fadeIn} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5 w-full" dir="rtl">
                <Label className="text-xs text-slate-500 block w-full text-right">
                  טלפון<span className="text-red-400 mr-0.5">*</span>
                </Label>
                <Input
                  id="customer-phone-new"
                  value={customerData.phone}
                  onChange={e => onPhoneChange(e.target.value)}
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
