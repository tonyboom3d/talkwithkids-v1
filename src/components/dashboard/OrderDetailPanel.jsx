import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  X, User, Phone, Mail, Package, CreditCard, Link2,
  MessageSquarePlus, Clock, CheckCircle2, XCircle,
  Send, Truck, AlertTriangle, FileEdit, Eye, StickyNote
} from "lucide-react";
import moment from "moment";

const timelineIcons = {
  created: { icon: Link2, color: "bg-blue-100 text-blue-600" },
  sent: { icon: Send, color: "bg-indigo-100 text-indigo-600" },
  opened: { icon: Eye, color: "bg-purple-100 text-purple-600" },
  paid: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
  failed: { icon: XCircle, color: "bg-red-100 text-red-600" },
  shipped: { icon: Truck, color: "bg-sky-100 text-sky-600" },
  note: { icon: StickyNote, color: "bg-amber-100 text-amber-600" },
  contact_updated: { icon: FileEdit, color: "bg-slate-200 text-slate-600" },
};

function TimelineItem({ event, isLast }) {
  const config = timelineIcons[event.type] || { icon: Clock, color: "bg-slate-100 text-slate-500" };
  const Icon = config.icon;

  return (
    <div className="flex gap-3 items-start">
      <div className={`flex-1 pb-4 ${!isLast ? '' : ''}`}>
        <div className="flex items-center gap-2 justify-end mb-0.5">
          <span className="text-xs text-slate-400">{moment(event.date).format("DD/MM HH:mm")}</span>
          <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">{event.by}</Badge>
        </div>
        <p className="text-sm text-slate-700 text-right">{event.text}</p>
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
    onCancelLink(order.id);
    setConfirmCancel(false);
  };

  if (!order) return null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onAddNote(order.id, newNote);
    setNewNote("");
    setIsAddingNote(false);
  };

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed top-0 left-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h3 className="text-sm font-bold text-slate-800">{order.id}</h3>
              <p className="text-xs text-slate-400">{moment(order.date).format("DD/MM/YYYY HH:mm")}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Customer Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">פרטי לקוח</h4>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-medium text-slate-700">{order.customer.firstName} {order.customer.lastName}</span>
                <User className="w-4 h-4 text-slate-400" />
              </div>
              {order.customer.phone ? (
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm text-slate-500" dir="ltr">{order.customer.phone}</span>
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
              {order.customer.email && (
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm text-slate-500" dir="ltr">{order.customer.email}</span>
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">מוצרים</h4>
            <div className="space-y-2">
              {order.products.map((p, i) => (
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
                <span className="text-base font-bold text-slate-800">₪{order.total.toLocaleString()}</span>
                <span className="text-sm text-slate-500">סה״כ</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">סטטוס תשלום</h4>
            <Badge className={`text-sm py-1.5 px-4 border-0 ${
              order.paymentStatus === "paid"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              <CreditCard className="w-4 h-4 ml-2" />
              {order.paymentStatus === "paid" ? "שולם" : "לא שולם"}
            </Badge>
          </div>

          {/* Payment Link */}
          {order.paymentLink && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">קישור תשלום</h4>
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-700 h-7 shrink-0"
                  onClick={() => navigator.clipboard.writeText(order.paymentLink)}
                >
                  העתק
                </Button>
                <span className="text-xs text-slate-500 truncate flex-1" dir="ltr">{order.paymentLink}</span>
                <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">תרשים זרימה</h4>
            <div className="space-y-0">
              {order.timeline.map((event, i) => (
                <TimelineItem key={i} event={event} isLast={i === order.timeline.length - 1} />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingNote(true)}
                className="text-xs text-slate-500 hover:text-slate-700 gap-1.5 h-7"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                הוסף הערה
              </Button>
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

            {order.orderNotes?.length > 0 ? (
              <div className="space-y-2">
                {order.orderNotes.map((note) => (
                  <motion.div
                    key={note.id}
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
          </div>
        </div>
      </motion.div>
    </>
  );
}