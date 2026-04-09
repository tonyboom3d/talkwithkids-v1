import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  X, User, Phone, Mail, Package, CreditCard, Link2,
  MessageSquarePlus, Clock, CheckCircle2, XCircle,
  Send, Truck, AlertTriangle, FileEdit, Eye, StickyNote, ExternalLink, Copy
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import { computeDisplayTotalAfterCoupon } from "@/utils/orderTotals";

function safeParseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

const timelineIcons = {
  created: { icon: Link2, color: "bg-blue-100 text-blue-600" },
  sent: { icon: Send, color: "bg-indigo-100 text-indigo-600" },
  link_opened: { icon: Eye, color: "bg-purple-100 text-purple-600" },
  opened: { icon: Eye, color: "bg-purple-100 text-purple-600" },
  paid: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
  failed: { icon: XCircle, color: "bg-red-100 text-red-600" },
  cancelled: { icon: XCircle, color: "bg-red-100 text-red-600" },
  shipped: { icon: Truck, color: "bg-sky-100 text-sky-600" },
  note: { icon: StickyNote, color: "bg-amber-100 text-amber-600" },
  contact_updated: { icon: FileEdit, color: "bg-slate-200 text-slate-600" },
};

function TimelineItem({ event, isLast }) {
  const config = timelineIcons[event.type || event.action] || { icon: Clock, color: "bg-slate-100 text-slate-500" };
  const Icon = config.icon;

  return (
    <div className="flex gap-3 items-start">
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 justify-end mb-0.5">
          <span className="text-xs text-slate-400">{moment(event.date).format("DD/MM HH:mm")}</span>
          <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">{event.by}</Badge>
        </div>
        <p className="text-sm text-slate-700 text-right">{event.text || event.detail}</p>
      </div>
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-px h-full bg-slate-200 min-h-[16px]" />}
      </div>
    </div>
  );
}

export default function OrderDetailPanel({ order, onClose, onAddNote, onCancelLink }) {
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleCancelLink = () => {
    onCancelLink(order._id || order.id);
    setConfirmCancel(false);
  };

  if (!order) return null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onAddNote(order._id || order.id, newNote);
    setNewNote("");
    setIsAddingNote(false);
  };

  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`
    : order.customerName || '';
  const customerPhone = order.customer?.phone || order.customerPhone || '';
  const customerEmail = order.customer?.email || order.customerEmail || '';
  const orderProducts = order.products ? (typeof order.products === 'string' ? JSON.parse(order.products) : order.products) : [];
  const couponDetails = safeParseJson(order.couponDetails, null);
  const rawSubtotal = Number(order.totalPrice ?? order.total ?? 0);
  const orderTotal =
    order.totalAmount != null && Number.isFinite(Number(order.totalAmount))
      ? Number(order.totalAmount)
      : computeDisplayTotalAfterCoupon(rawSubtotal, couponDetails && typeof couponDetails === "object" ? couponDetails : null);
  const timeline = order.changeChain || order.timeline || [];
  const orderNotes = order.orderNotes || [];
  const checkoutLink = order.checkoutLink || order.paymentLink || '';
  const orderId =
    order.orderNumber && String(order.orderNumber).trim()
      ? order.orderNumber
      : 'ממתין לתשלום';
  const orderDate = order._createdDate || order.date;
  const isLinkCancelled = order.linkCancelled || order.status === 'cancelled';

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
      />

      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed top-0 left-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
        dir="rtl"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h3 className="text-sm font-bold text-slate-800">{orderId}</h3>
              <p className="text-xs text-slate-400">{orderDate ? moment(orderDate).format("DD/MM/YYYY HH:mm") : ''}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Customer */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">פרטי לקוח</h4>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-medium text-slate-700">{customerName}</span>
                <User className="w-4 h-4 text-slate-400" />
              </div>
              {customerPhone ? (
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm text-slate-500" dir="ltr">{customerPhone}</span>
                  <Phone className="w-4 h-4 text-slate-400" />
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-end">
                  <Badge className="text-[10px] bg-amber-50 text-amber-600 border-amber-200 gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    חסר טלפון
                  </Badge>
                  <Phone className="w-4 h-4 text-slate-300" />
                </div>
              )}
              {customerEmail && (
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm text-slate-500" dir="ltr">{customerEmail}</span>
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">מוצרים</h4>
            <div className="space-y-2">
              {orderProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-semibold text-slate-700">₪{(p.price * p.quantity).toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-sm text-slate-700">{p.name}</span>
                      {p.quantity > 1 && <span className="text-xs text-slate-400 mr-1">×{p.quantity}</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 px-1">
                <span className="text-base font-bold text-slate-800">₪{orderTotal.toLocaleString()}</span>
                <span className="text-sm text-slate-500">סה״כ</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">סטטוס תשלום</h4>
            <Badge className={`text-sm py-1.5 px-4 border-0 ${
              order.status === 'paid' || order.paymentStatus === "paid"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              <CreditCard className="w-4 h-4 ml-2" />
              {order.status === 'paid' || order.paymentStatus === "paid" ? "שולם" : "לא שולם"}
            </Badge>
          </div>

          {/* Payment Link */}
          {checkoutLink && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">קישור תשלום</h4>
              {isLinkCancelled ? (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-center gap-2 justify-end">
                  <span className="text-sm font-medium text-red-600">קישור מבוטל</span>
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600 hover:text-blue-700 h-7 shrink-0 gap-1"
                      onClick={() => { navigator.clipboard.writeText(checkoutLink); toast.success("הקישור הועתק"); }}
                    >
                      <Copy className="w-3 h-3" />
                      העתק
                    </Button>
                    <span className="text-xs text-slate-500 truncate flex-1" dir="ltr">{checkoutLink}</span>
                    <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <AnimatePresence>
                    {confirmCancel ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                          <p className="text-xs text-red-700 text-right">האם לבטל את הקישור? פעולה זו אינה ניתנת לביטול.</p>
                          <div className="flex gap-2 justify-start">
                            <Button size="sm" className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white" onClick={handleCancelLink}>
                              כן, בטל קישור
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setConfirmCancel(false)}>
                              חזרה
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      onCancelLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 w-full gap-1.5"
                          onClick={() => setConfirmCancel(true)}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          ביטול קישור
                        </Button>
                      )
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">תרשים זרימה</h4>
              <div className="space-y-0">
                {timeline.map((event, i) => (
                  <TimelineItem key={i} event={event} isLast={i === timeline.length - 1} />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {onAddNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingNote(true)}
                  className="text-xs text-slate-500 hover:text-slate-700 gap-1.5 h-7"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  הוסף הערה
                </Button>
              )}
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">הערות</h4>
            </div>

            <AnimatePresence>
              {isAddingNote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                    <Textarea
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="רשום הערה חדשה..."
                      className="min-h-[70px] text-sm border-blue-200 focus:border-blue-300 bg-white resize-none"
                      dir="rtl"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-start">
                      <Button size="sm" className="text-xs h-8 bg-slate-800 hover:bg-slate-700 text-white" onClick={handleAddNote}>
                        שמור
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setIsAddingNote(false); setNewNote(""); }}>
                        ביטול
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {orderNotes.length > 0 ? (
              <div className="space-y-2">
                {orderNotes.map((note, i) => (
                  <motion.div
                    key={note.id || i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                  >
                    <p className="text-sm text-slate-700 text-right mb-1.5">{note.text}</p>
                    <div className="flex items-center gap-2 justify-end text-[11px] text-slate-400">
                      <span>{moment(note.date).format("DD/MM/YY HH:mm")}</span>
                      <span>•</span>
                      <span>{note.by}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : !isAddingNote && (
              <p className="text-sm text-slate-400 text-center py-3">אין הערות</p>
            )}

            {/* Internal notes from the order */}
            {order.notes && (
              <div className="mt-2 bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-1">הערות פנימיות:</p>
                <p className="text-sm text-slate-600">{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
