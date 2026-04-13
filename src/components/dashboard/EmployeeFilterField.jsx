import React from "react";
import { ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function buildEmployeeSummary(includeAllCreators, selectedCreatorKeys, creatorOptions) {
  if (includeAllCreators) return "כל העובדים";

  const selectedCount = selectedCreatorKeys.size;
  if (selectedCount === 0) return "לא נבחרו עובדים";
  if (selectedCount === creatorOptions.length) return "כל העובדים (נבחר)";

  if (selectedCount === 1) {
    const selectedId = [...selectedCreatorKeys][0];
    const selectedOption = creatorOptions.find((option) => option.id === selectedId);
    return selectedOption?.label || "עובד/ת אחד/ת";
  }

  return `${selectedCount} עובדים נבחרו`;
}

export default function EmployeeFilterField({
  creatorOptions,
  includeAllCreators,
  selectedCreatorKeys,
  onIncludeAllChange,
  onToggleCreator,
  disabled = false,
  className = "",
  align = "start",
}) {
  if (!creatorOptions?.length) return null;

  const summary = buildEmployeeSummary(includeAllCreators, selectedCreatorKeys, creatorOptions);

  return (
    <div className={cn("flex items-center justify-end", className)} dir="rtl">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 min-w-[220px] justify-between gap-2 border-slate-200"
            disabled={disabled}
          >
            <span className="flex items-center gap-2 truncate">
              <Users className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate text-sm">סינון לפי עובדים: {summary}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align={align} dir="rtl">
          <div className="space-y-3">
            <div className="flex items-center gap-2 space-x-reverse">
              <Checkbox
                id="filter-all-creators"
                checked={includeAllCreators}
                onCheckedChange={(checked) => onIncludeAllChange(checked === true)}
              />
              <Label htmlFor="filter-all-creators" className="cursor-pointer text-sm font-medium">
                כל העובדים
              </Label>
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto border-t border-slate-100 pt-2">
              {creatorOptions.map(({ id, label }) => (
                <div key={id} className="flex items-center gap-2 space-x-reverse">
                  <Checkbox
                    id={`filter-creator-${id}`}
                    checked={selectedCreatorKeys.has(id)}
                    disabled={includeAllCreators}
                    onCheckedChange={(checked) => onToggleCreator(id, checked === true)}
                  />
                  <Label
                    htmlFor={`filter-creator-${id}`}
                    className={cn(
                      "flex-1 cursor-pointer truncate text-sm",
                      includeAllCreators && "cursor-not-allowed text-slate-400"
                    )}
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>

            {!includeAllCreators && selectedCreatorKeys.size === 0 && (
              <p className="text-xs text-amber-700">
                נא לבחור לפחות עובד/ת אחד/ת, או לסמן "כל העובדים".
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
