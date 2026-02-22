import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, AlertTriangle, Pencil, Phone, Mail, User } from "lucide-react";
import { LoadingSpinner } from "./LoadingSkeleton";
import { DEMO_CUSTOMERS } from "./DemoDataProvider";

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: "easeOut" }
};

export default function CustomerSection({ isDemo, customerData, setCustomerData }) {
  const [isExisting, setIsExisting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // fullName helper
  const fullName = `${customerData.firstName || ""}${customerData.lastName ? " " + customerData.lastName : ""}`.trim();

  // Simulate search with demo data
  useEffect(() => {
    if (!searchQuery.trim() || !isExisting) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    const timer = setTimeout(() => {
      if (isDemo) {
        const filtered = DEMO_CUSTOMERS.filter(c =>
          `${c.firstName} ${c.lastName}`.includes(searchQuery) ||
          c.phone.includes(searchQuery) ||
          c.email.includes(searchQuery)
        );
        setSearchResults(filtered);
      } else {
        // In production, this would call Velo
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [searchQuery, isExisting, isDemo]);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
    });
    setShowResults(false);
    setSearchQuery("");
    setIsEditing(false);
  };

  const handleToggle = (checked) => {
    setIsExisting(checked);
    setSelectedCustomer(null);
    setIsEditing(false);
    setSearchQuery("");
    if (!checked) {
      setCustomerData({ firstName: "", lastName: "", email: "", phone: "" });
    }
  };

  const handleFieldChange = (field, value) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
    if (selectedCustomer) {
      setSelectedCustomer(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <motion.div {...fadeIn} className="space-y-5">
      {/* Toggle */}
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
            {/* Search Field */}
            {!selectedCustomer && (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי שם, טלפון או אימייל..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 text-sm h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400/20"
                  dir="rtl"
                />

                {/* Search Results Dropdown */}
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
                                <div className="text-xs text-slate-400 truncate">{c.phone || c.email || "—"}</div>
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

            {/* Selected Customer Card */}
            {selectedCustomer && !isEditing && (
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
                    <div className="text-sm font-semibold text-slate-800">{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-right">
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2 justify-end text-xs text-slate-500">
                      <span>{selectedCustomer.email}</span>
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {selectedCustomer.phone ? (
                    <div className="flex items-center gap-2 justify-end text-xs text-slate-500">
                      <span>{selectedCustomer.phone}</span>
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
                    onClick={() => { setSelectedCustomer(null); setSearchQuery(""); }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    בחר לקוח אחר ←
                  </button>
                </div>
              </motion.div>
            )}

            {/* Edit Mode for Existing Customer */}
            {selectedCustomer && isEditing && (
              <motion.div {...fadeIn} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">שם פרטי</Label>
                    <Input value={customerData.firstName} onChange={e => handleFieldChange("firstName", e.target.value)} className="h-10 text-sm border-slate-200" dir="rtl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">שם משפחה</Label>
                    <Input value={customerData.lastName} onChange={e => handleFieldChange("lastName", e.target.value)} className="h-10 text-sm border-slate-200" dir="rtl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 block text-right">אימייל</Label>
                    <Input value={customerData.email} onChange={e => handleFieldChange("email", e.target.value)} className="h-10 text-sm border-slate-200 text-right" dir="rtl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 block text-right">טלפון</Label>
                    <Input value={customerData.phone} onChange={e => handleFieldChange("phone", e.target.value)} className="h-10 text-sm border-slate-200 text-right" dir="rtl" />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">שם פרטי</Label>
                <Input
                  value={customerData.firstName}
                  onChange={e => setCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="שם פרטי"
                  className="h-10 text-sm border-slate-200 focus:border-slate-400"
                  dir="rtl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">שם משפחה</Label>
                <Input
                  value={customerData.lastName}
                  onChange={e => setCustomerData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="שם משפחה"
                  className="h-10 text-sm border-slate-200 focus:border-slate-400"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 block text-right">אימייל</Label>
              <Input
                value={customerData.email}
                onChange={e => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="example@email.com"
                className="h-10 text-sm border-slate-200 focus:border-slate-400 text-right"
                dir="rtl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 flex items-center gap-1 justify-end w-full text-right">
                <span className="text-red-400">*</span>
                טלפון
              </Label>
              <Input
                value={customerData.phone}
                onChange={e => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="050-0000000"
                className="h-10 text-sm border-slate-200 focus:border-slate-400 text-right"
                dir="rtl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}