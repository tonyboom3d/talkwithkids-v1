import React from "react";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, CreditCard, Package, Phone, UserRound, Workflow } from "lucide-react";
import FulfillmentStatusIcon from "./FulfillmentStatusIcon";
import { formatCreatorFirstName } from "@/utils/dashboardOrders";

/**
 * תוכן "פרטי לקוח ותשלום" — משותף לתצוגת האקורדיון (מחשב) ולכרטיס המאוחד (נייד).
 */
export default function OrderCustomerDetails({
  order,
  editingDueDateRowId,
  dueDateDraft,
  setDueDateDraft,
  onOpenDueDateEditor,
  onCloseDueDateEditor,
  onSaveDueDate,
  busyAction,
  canEditDueDate,
  minDueDate,
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:gap-2">
      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right">
        <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <UserRound className="w-3 h-3" />
          <span>לקוח</span>
        </div>
        <p className="break-words text-xs font-medium text-slate-700 md:text-sm">{order.customerName || "—"}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right">
        <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <Phone className="w-3 h-3" />
          <span>טלפון</span>
        </div>
        <p className="text-xs md:text-sm text-slate-700 tabular-nums" dir="ltr">{order.customerPhone || "—"}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right">
        <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <CalendarDays className="w-3 h-3" />
          <span>תאריך יצירה</span>
        </div>
        <p className="text-xs md:text-sm text-slate-700">{order.orderDate ? moment(order.orderDate).format("DD/MM/YY HH:mm") : "—"}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right">
        <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <Workflow className="w-3 h-3" />
          <span>סטטוס</span>
        </div>
        <Badge variant="outline" className={`inline-flex whitespace-nowrap text-[10px] border-0 font-medium ${order.statusCfg.className}`}>
          {order.statusCfg.label}
        </Badge>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right">
        <p className="text-[10px] text-slate-400 mb-0.5">מס׳ הזמנה</p>
        <p className="break-all text-xs font-mono text-slate-600 md:text-sm">{order.orderNumber}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right">
        <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <Package className="w-3 h-3" />
          <span>משלוח</span>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          {order.deliveryNumber && order.deliveryNumber !== "—" && (
            <span className="break-all text-xs font-mono text-slate-600 md:text-sm">{order.deliveryNumber}</span>
          )}
          <FulfillmentStatusIcon
            status={order.shippingStatus}
            tooltip={order.shippingStatus === "yes" && order.deliveryNumber && order.deliveryNumber !== "—" ? order.deliveryNumber : ""}
          />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right">
        <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <Package className="w-3 h-3" />
          <span>תוכנית</span>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          {order.hasPlan && order.planName ? (
            <span className="break-words text-xs font-medium text-slate-700 md:text-sm">{order.planName}</span>
          ) : null}
          <FulfillmentStatusIcon status={order.planStatus} tooltip={order.planStatus === "yes" ? order.planName : ""} />
        </div>
      </div>
      {["awaiting_deposit", "deposit_paid", "paid_partial"].includes(order.displayStatus) && (
        <div
          className={`rounded-lg border px-2 py-1.5 md:px-3 md:py-2.5 text-right ${
            order.rowTone === "red" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
            <CalendarDays className="w-3 h-3" />
            <span>תאריך יעד לתשלום יתרה</span>
          </div>
          {editingDueDateRowId === order.rowId ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={dueDateDraft}
                min={minDueDate}
                onChange={(e) => setDueDateDraft(e.target.value)}
                className="h-7 text-xs"
                dir="ltr"
              />
              <Button
                size="sm"
                className="h-7 px-2 text-[10px]"
                disabled={!dueDateDraft || (busyAction.type === "dueDate" && busyAction.rowId === order.rowId)}
                onClick={() => onSaveDueDate(order)}
              >
                שמירה
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={onCloseDueDateEditor}>
                ביטול
              </Button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canEditDueDate}
              onClick={() => onOpenDueDateEditor(order)}
              className={`text-xs md:text-sm font-medium ${order.rowTone === "red" ? "text-red-700" : "text-slate-700"} ${canEditDueDate ? "hover:underline" : ""}`}
            >
              {order.balanceDueDate ? moment(order.balanceDueDate).format("DD/MM/YY") : "לא נקבע"}
            </button>
          )}
        </div>
      )}
      {order.depositOptions && (order.depositOptions.hasShipping || order.depositOptions.hasPlan) && (
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right col-span-2">
          <p className="text-[10px] text-slate-400 mb-0.5">הגדרות מקדמה</p>
          {order.depositOptions.hasShipping && (
            <p className="text-xs text-slate-700">
              שליחת הערכה לאחר מקדמה: <b>{order.depositOptions.shipAfterDeposit ? "מופעל" : "כבוי"}</b>
            </p>
          )}
          {order.depositOptions.hasPlan && (
            <p className="text-xs text-slate-700">
              פתיחת קורס/תוכנית לאחר תשלום המקדמה: <b>{order.depositOptions.unlockProgram ? "מופעל" : "כבוי"}</b>
            </p>
          )}
        </div>
      )}
      {order.displayStatus === "paid_partial" && order.partialPaidAmount > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 md:px-3 md:py-2.5 text-right">
          <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-orange-700">
            <CreditCard className="w-3 h-3" />
            <span>שולם מראש</span>
          </div>
          <p className="text-xs md:text-sm font-semibold text-orange-800">
            ₪{order.partialPaidAmount.toLocaleString("he-IL")}
          </p>
        </div>
      )}
      {order.displayStatus === "paid_partial" && order.partialPaidAmount > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right">
          <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
            <CreditCard className="w-3 h-3" />
            <span>יתרה לתשלום</span>
          </div>
          <p className="text-xs md:text-sm font-semibold text-[#C2410B]">
            ₪{(order.remainingPaymentAmount ?? 0).toLocaleString("he-IL")}
          </p>
        </div>
      )}
      {order.displayStatus !== "paid_partial" && order.partialPaidAmount > 0 && order.couponDetails?.source === "auto_paid" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 md:px-3 md:py-2.5 text-right">
          <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-emerald-700">
            <CreditCard className="w-3 h-3" />
            <span>שולם בפועל</span>
          </div>
          <p className="text-xs md:text-sm font-semibold text-emerald-900">
            ₪{order.partialPaidAmount.toLocaleString("he-IL")}
          </p>
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2.5 text-right">
        <div className="mb-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <UserRound className="w-3 h-3" />
          <span>נוצרה על ידי</span>
        </div>
        <p className="break-words text-xs text-slate-700 md:text-sm">{formatCreatorFirstName(order.creatorName)}</p>
      </div>
      {order.orderChangeNotes && (
        <div className="col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 md:px-3 md:py-2">
          <p className="text-[10px] text-amber-700 mb-0.5 text-right">שינויים בערכה</p>
          <p className="text-xs md:text-sm text-amber-900 text-right">{order.orderChangeNotes}</p>
        </div>
      )}
      {order.notes && (
        <div className="col-span-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2">
          <p className="text-[10px] text-slate-400 mb-0.5 text-right">הערות פנימיות</p>
          <p className="text-xs md:text-sm text-slate-600 text-right">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
