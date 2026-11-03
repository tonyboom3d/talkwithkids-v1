import React from "react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Banknote,
  Copy,
  Download,
  ExternalLink,
  FileText,
  MessageCircleMore,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";

/**
 * תוכן תפריט "פעולות נוספות" — משותף לכפתור בשורת הטבלה ולכפתור בשורה הפתוחה (ר' OrdersTable).
 */
export default function OrderActionsMenu({
  order,
  align = "start",
  className = "w-52",
  isBusy,
  isCancelled,
  isError,
  canResendWhatsapp,
  onResendWhatsapp,
  onCopyLink,
  onOpenOrder,
  canAssign,
  onAssign,
  canCompletePayment,
  onCompletePayment,
  canGenerateInvoices,
  invoiceDocs = [],
  onViewDoc,
  onResendInvoiceDoc,
  onGenerateInvoice,
  formatInvoiceDocLabel,
  canDelete,
  onDelete,
}) {
  const hasDocs = invoiceDocs.length > 0;

  return (
    <DropdownMenuContent align={align} className={className} dir="rtl">
      <DropdownMenuItem
        disabled={!order.publicOrderUrl || !canResendWhatsapp || isBusy || isCancelled || isError}
        onClick={onResendWhatsapp}
      >
        <MessageCircleMore className="w-4 h-4" />
        שליחה חוזרת לוואטסאפ
      </DropdownMenuItem>
      <DropdownMenuItem disabled={!order.publicOrderUrl || isError} onClick={onCopyLink}>
        <Copy className="w-4 h-4" />
        העתקת קישור
      </DropdownMenuItem>
      <DropdownMenuItem disabled={!order.publicOrderUrl || isError} onClick={onOpenOrder}>
        <ExternalLink className="w-4 h-4" />
        פתיחת ההזמנה בחלון חדש
      </DropdownMenuItem>
      {canAssign && (
        <DropdownMenuItem disabled={isBusy || isError} onClick={onAssign}>
          <UserRound className="w-4 h-4" />
          שינוי שיוך
        </DropdownMenuItem>
      )}
      {canCompletePayment && (
        <DropdownMenuItem disabled={isBusy || isError} onClick={onCompletePayment}>
          <Banknote className="w-4 h-4" />
          השלמת תשלום
        </DropdownMenuItem>
      )}
      {canGenerateInvoices && (
        <>
          <DropdownMenuSeparator />
          {!hasDocs ? (
            <DropdownMenuItem disabled={isBusy || isError} onClick={onGenerateInvoice}>
              <FileText className="w-4 h-4" />
              הפקת חשבונית
            </DropdownMenuItem>
          ) : invoiceDocs.length === 1 ? (
            <>
              <DropdownMenuItem onClick={() => onViewDoc(invoiceDocs[invoiceDocs.length - 1])}>
                <Download className="w-4 h-4" />
                צפייה / הורדת חשבונית
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isBusy || isError}
                onClick={() => onResendInvoiceDoc(invoiceDocs[0])}
              >
                <Send className="w-4 h-4" />
                שליחה חוזרת של חשבונית
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isBusy || isError} onClick={onGenerateInvoice}>
                <FileText className="w-4 h-4" />
                הפקת חשבונית נוספת
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel className="text-xs text-slate-400">צפייה / הורדה</DropdownMenuLabel>
              {[...invoiceDocs].reverse().map((doc) => (
                <DropdownMenuItem
                  key={`view-${doc.docId || doc.docNumber}`}
                  disabled={!doc.url}
                  onClick={() => onViewDoc(doc)}
                >
                  <Download className="w-4 h-4" />
                  {formatInvoiceDocLabel(doc)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuLabel className="text-xs text-slate-400">שליחה חוזרת</DropdownMenuLabel>
              {[...invoiceDocs].reverse().map((doc) => (
                <DropdownMenuItem
                  key={`resend-${doc.docId || doc.docNumber}`}
                  disabled={isBusy || isError}
                  onClick={() => onResendInvoiceDoc(doc)}
                >
                  <Send className="w-4 h-4" />
                  {formatInvoiceDocLabel(doc)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem disabled={isBusy || isError} onClick={onGenerateInvoice}>
                <FileText className="w-4 h-4" />
                הפקת חשבונית נוספת
              </DropdownMenuItem>
            </>
          )}
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-red-600 focus:text-red-700"
        disabled={!canDelete || isBusy || isError}
        onClick={onDelete}
      >
        <XCircle className="w-4 h-4" />
        ביטול הזמנה
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
