import React from "react";
import { Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { creatorTagStyleFromColor } from "@/utils/employeeTagStyle";
import { cn } from "@/lib/utils";

export default function EmployeeAssignField({
  employees = [],
  value,
  onChange,
  disabled = false,
  label = "שיוך ההזמנה לעובד/ת",
  className = "",
}) {
  if (!employees?.length) return null;

  const selected = employees.find((emp) => emp.id === value);

  return (
    <div className={cn("space-y-2", className)} dir="rtl">
      <Label className="block text-right text-sm font-medium text-slate-700">{label}</Label>
      <Select
        value={value || ""}
        onValueChange={onChange}
        disabled={disabled}
        dir="rtl"
      >
        <SelectTrigger className="h-10 w-full justify-between border-slate-200 text-right">
          <SelectValue placeholder="בחר/י עובד/ת">
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <Users className="h-4 w-4 shrink-0 text-slate-500" />
                <span
                  className={cn(
                    "truncate rounded-full border px-2 py-0.5 text-xs font-medium",
                    !selected.color && "border-slate-200 bg-slate-50 text-slate-700"
                  )}
                  style={creatorTagStyleFromColor(selected.color)}
                >
                  {selected.displayName || selected.id}
                </span>
              </span>
            ) : (
              "בחר/י עובד/ת"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60" dir="rtl">
          {employees.map((emp) => (
            <SelectItem key={emp.id} value={emp.id} className="text-right">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs font-medium",
                    !emp.color && "border-slate-200 bg-slate-50 text-slate-700"
                  )}
                  style={creatorTagStyleFromColor(emp.color)}
                >
                  {emp.displayName || emp.id}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
