import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Link2,
  Loader2,
  Mail,
  Search,
  Smartphone,
} from "lucide-react";
import moment from "moment";

export default function TransactionPickerDialog({ open, onClose, onCreateInvoice, request }) {
  const [fromDate, setFromDate] = useState(() => moment().subtract(30, "days").format("YYYY-MM-DD"));
  const [toDate, setToDate] = useState(() => moment().format("YYYY-MM-DD"));
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedTx, setSelectedTx] = useState(null);
  const [sendByEmail, setSendByEmail] = useState(false);
  const [sendBySMS, setSendBySMS] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [linkConfirmStep, setLinkConfirmStep] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLoadTransactions = useCallback(async () => {
    if (!request) return;
    setIsLoadingTx(true);
    setLoadError("");
    setSelectedTx(null);
    setDuplicateWarning(null);
    setLinkConfirmStep(null);
    try {
      const result = await request("LIST_TRANSACTIONS", {
        fromDate,
        toDate,
        page: 1,
        recordsPerPage: 100,
      });
      setTransactions(result.transactions || []);
      if (!(result.transactions || []).length) {
        setLoadError("לא נמצאו עסקאות בטווח התאריכים שנבחר");
      }
    } catch (err) {
      setLoadError(err.message || "שגיאה בטעינת רשימת העסקאות");
      setTransactions([]);
    } finally {
      setIsLoadingTx(false);
    }
  }, [fromDate, toDate, request]);

  const handleCreate = useCallback(async (force = false) => {
    if (!selectedTx || !onCreateInvoice) return;
    setIsCreating(true);
    try {
      const result = await onCreateInvoice(selectedTx.dealId, {
        isSendByEmail: sendByEmail,
        isSendSMS: sendBySMS,
        force,
        dealAmount: selectedTx.amount,
        returnValue: selectedTx.returnValue || "",
        customerPhone: selectedTx.customerPhone || "",
      });
      if (result?.alreadyExists && !force) {
        setDuplicateWarning(result);
        setLinkConfirmStep(null);
        setIsCreating(false);
        return;
      }
      setDuplicateWarning(null);
      setLinkConfirmStep(null);
      setSelectedTx(null);
      onClose();
    } catch (err) {
      // error toast is handled by the parent
    } finally {
      setIsCreating(false);
    }
  }, [selectedTx, sendByEmail, sendBySMS, onCreateInvoice, onClose]);

  const handleStartCreate = () => {
    if (!selectedTx) return;
    setLinkConfirmStep(selectedTx.hasCmsOrder ? "linked" : "unlinked");
  };

  const handleClose = () => {
    if (isCreating) return;
    setDuplicateWarning(null);
    setLinkConfirmStep(null);
    setSelectedTx(null);
    onClose();
  };

  const filteredTransactions = searchQuery.trim()
    ? transactions.filter((tx) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          String(tx.dealNumber).includes(q) ||
          String(tx.returnValue || "").toLowerCase().includes(q) ||
          String(tx.customerName || "").toLowerCase().includes(q) ||
          String(tx.linkedOrderNumber || "").includes(q) ||
          String(tx.amount).includes(q)
        );
      })
    : transactions;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent dir="rtl" className="max-w-lg top-4 left-[50%] max-h-[min(90vh,calc(100dvh-1rem))] translate-x-[-50%] translate-y-0 overflow-y-auto sm:top-6">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">הפקת חשבונית מעסקה</DialogTitle>
          <DialogDescription className="text-right leading-relaxed">
            בחרי טווח תאריכים, טעני את העסקאות, ובחרי את העסקה שעבורה יש להפיק חשבונית.
          </DialogDescription>
        </DialogHeader>

        {duplicateWarning ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-right">
              כבר קיימת חשבונית פעילה עבור עסקה זו. האם להפיק חשבונית נוספת?
            </div>
            <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handleCreate(true)}
                disabled={isCreating}
              >
                {isCreating ? "מפיק..." : "כן, להפיק חשבונית נוספת"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDuplicateWarning(null)}
                disabled={isCreating}
              >
                ביטול
              </Button>
            </DialogFooter>
          </div>
        ) : linkConfirmStep === "linked" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 text-right">
              העסקה מקושרת להזמנה{" "}
              <span className="font-semibold">
                {selectedTx?.linkedOrderNumber || "—"}
              </span>
              {selectedTx?.linkedOrderCustomerName ? (
                <> של {selectedTx.linkedOrderCustomerName}</>
              ) : null}
              . פרטי החשבונית יישמרו ברשומת ההזמנה בדאשבורד.
            </div>
            <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
              <Button
                type="button"
                className="bg-slate-900 hover:bg-slate-800 text-white"
                onClick={() => handleCreate(false)}
                disabled={isCreating}
              >
                {isCreating ? "מפיק..." : "אישור והפקה"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLinkConfirmStep(null)}
                disabled={isCreating}
              >
                ביטול
              </Button>
            </DialogFooter>
          </div>
        ) : linkConfirmStep === "unlinked" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-right leading-relaxed">
              העסקה לא משויכת להזמנה מהדאשבורד. ייתכן שהיא לא הוקמה דרך המערכת.
              החשבונית תופק ב-Cardcom, אך לאחר ההפקה לא יופיע תיעוד לכך בדאשבורד.
            </div>
            <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handleCreate(false)}
                disabled={isCreating}
              >
                {isCreating ? "מפיק..." : "המשך להפקה"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLinkConfirmStep(null)}
                disabled={isCreating}
              >
                ביטול
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 text-sm flex-1 min-w-[120px]"
              />
              <span className="text-xs text-slate-400">עד</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 text-sm flex-1 min-w-[120px]"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleLoadTransactions}
                disabled={isLoadingTx}
                className="h-9 bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shrink-0"
              >
                {isLoadingTx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                טעינה
              </Button>
            </div>

            {loadError && (
              <p className="text-xs text-red-500 text-right">{loadError}</p>
            )}

            {transactions.length > 0 && (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי מספר עסקה, הזמנה, שם, סכום..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-8 text-xs border-slate-200 text-right"
                  dir="rtl"
                />
              </div>
            )}

            {transactions.length > 0 && (
              <div className="max-h-[240px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">לא נמצאו עסקאות מתאימות</p>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isSelected = selectedTx?.dealId === tx.dealId;
                    return (
                      <button
                        key={tx.dealId}
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className={`w-full text-right px-3 py-2.5 transition-colors ${
                          isSelected ? "bg-slate-100" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-slate-600">#{tx.dealNumber}</span>
                              {tx.customerName && (
                                <span className="text-xs text-slate-500 truncate">{tx.customerName}</span>
                              )}
                              {tx.hasCmsOrder ? (
                                <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700 px-1.5 py-0">
                                  <Link2 className="w-3 h-3 ml-1" />
                                  הזמנה {tx.linkedOrderNumber || "—"}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-slate-200 bg-slate-50 text-slate-500 px-1.5 py-0">
                                  ללא הזמנה בדאשבורד
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400">
                                {tx.date ? moment(tx.date).format("DD/MM/YY HH:mm") : "—"}
                              </span>
                              {tx.cardLastDigits && (
                                <span className="text-[10px] text-slate-400" dir="ltr">****{tx.cardLastDigits}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold text-slate-700 tabular-nums">
                              ₪{Number(tx.amount).toLocaleString("he-IL")}
                            </span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {transactions.length === 0 && !isLoadingTx && !loadError && (
              <p className="text-xs text-slate-400 text-center py-4">בחרי טווח תאריכים ולחצי "טעינה" לצפייה ברשימת העסקאות</p>
            )}

            {selectedTx && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-600 text-right">
                  עסקה #{selectedTx.dealNumber} — ₪{Number(selectedTx.amount).toLocaleString("he-IL")}
                </p>
                {selectedTx.hasCmsOrder ? (
                  <p className="text-xs text-emerald-700 text-right">
                    תקושר להזמנה {selectedTx.linkedOrderNumber || "—"} בדאשבורד
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 text-right">
                    לא נמצאה הזמנה תואמת בדאשבורד — החשבונית לא תתועד במערכת
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 transition-colors text-xs" dir="rtl">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      sendByEmail ? "bg-slate-900 border-slate-900" : "border-slate-300"
                    }`}>
                      {sendByEmail && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-700">מייל</span>
                    <input type="checkbox" className="sr-only" checked={sendByEmail} onChange={(e) => setSendByEmail(e.target.checked)} />
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 transition-colors text-xs" dir="rtl">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      sendBySMS ? "bg-slate-900 border-slate-900" : "border-slate-300"
                    }`}>
                      {sendBySMS && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>
                    <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-700">SMS</span>
                    <input type="checkbox" className="sr-only" checked={sendBySMS} onChange={(e) => setSendBySMS(e.target.checked)} />
                  </label>
                </div>
              </div>
            )}

            <DialogFooter className="sm:justify-start sm:space-x-0 gap-2">
              <Button
                type="button"
                className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                onClick={handleStartCreate}
                disabled={!selectedTx || isCreating}
              >
                {isCreating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> מפיק...</>
                ) : (
                  <><FileText className="w-4 h-4" /> הפקת חשבונית</>
                )}
              </Button>
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isCreating}>
                ביטול
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
