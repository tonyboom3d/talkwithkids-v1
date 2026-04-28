import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, X } from "lucide-react";
import moment from "moment";

const MONTHS_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const DAYS_HE = ["א","ב","ג","ד","ה","ו","ש"];

const PRESETS = [
  { label: "השבוע", getValue: () => ({ from: moment().startOf("week").toDate(), to: moment().endOf("week").toDate() }) },
  { label: "החודש", getValue: () => ({ from: moment().startOf("month").toDate(), to: moment().endOf("month").toDate() }) },
  { label: "החודש שעבר", getValue: () => ({ from: moment().subtract(1,"month").startOf("month").toDate(), to: moment().subtract(1,"month").endOf("month").toDate() }) },
  { label: "3 חודשים אחרונים", getValue: () => ({ from: moment().subtract(3,"month").startOf("day").toDate(), to: moment().endOf("day").toDate() }) },
  { label: "השנה", getValue: () => ({ from: moment().startOf("year").toDate(), to: moment().endOf("year").toDate() }) },
  { label: "הכל", getValue: () => ({ from: null, to: null }) },
];

export function MiniCalendar({ viewDate, setViewDate, range, onDayClick, hovered, setHovered }) {
  const start = moment(viewDate).startOf("month");
  const daysInMonth = start.daysInMonth();
  const firstDow = (start.day() + 1) % 7; // shift so Sunday=0 maps to col 0 (RTL: col 6)
  const rtlFirstDow = 6 - firstDow; // RTL: pad from right

  const days = [];
  // padding
  for (let i = 0; i < (6 - rtlFirstDow); i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3 px-1">
        <button onClick={() => setViewDate(moment(viewDate).add(1,"month").toDate())}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {MONTHS_HE[moment(viewDate).month()]} {moment(viewDate).year()}
        </span>
        <button onClick={() => setViewDate(moment(viewDate).subtract(1,"month").toDate())}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAYS_HE.map(d => (
          <div key={d} className="text-center text-[10px] text-slate-400 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const date = moment(viewDate).date(d).startOf("day");
          const isFrom = range.from && date.isSame(moment(range.from).startOf("day"), "day");
          const isTo = range.to && date.isSame(moment(range.to).startOf("day"), "day");
          const inRange = range.from && range.to && date.isAfter(moment(range.from).startOf("day")) && date.isBefore(moment(range.to).startOf("day"));
          const isHovered = range.from && !range.to && hovered && date.isAfter(moment(range.from).startOf("day")) && date.isBefore(moment(hovered).startOf("day").add(1,"day"));

          return (
            <button key={d}
              onClick={() => onDayClick(date.toDate())}
              onMouseEnter={() => setHovered(date.toDate())}
              onMouseLeave={() => setHovered(null)}
              className={`h-8 w-full text-xs rounded-md transition-colors font-medium
                ${isFrom || isTo ? "bg-slate-900 text-white" : ""}
                ${inRange || isHovered ? "bg-slate-100 text-slate-700" : ""}
                ${!isFrom && !isTo && !inRange && !isHovered ? "text-slate-600 hover:bg-slate-100" : ""}
              `}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [range, setRange] = useState(value || { from: null, to: null });
  const [hovered, setHovered] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDayClick = (date) => {
    if (!range.from || (range.from && range.to)) {
      const newRange = { from: date, to: null };
      setRange(newRange);
    } else {
      const newRange = date < range.from
        ? { from: date, to: range.from }
        : { from: range.from, to: date };
      setRange(newRange);
      onChange(newRange);
      setOpen(false);
    }
  };

  const handlePreset = (preset) => {
    const newRange = preset.getValue();
    setRange(newRange);
    onChange(newRange);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    const cleared = { from: null, to: null };
    setRange(cleared);
    onChange(cleared);
  };

  const label = () => {
    if (!value?.from && !value?.to) return "כל התקופות";
    if (value.from && !value.to) return moment(value.from).format("DD/MM/YY") + " → ...";
    if (value.from && value.to) return `${moment(value.from).format("DD/MM/YY")} – ${moment(value.to).format("DD/MM/YY")}`;
    return "בחר תקופה";
  };

  const hasFilter = value?.from || value?.to;

  return (
    <div className="relative z-[60] overflow-visible" ref={ref} dir="rtl">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors
          ${hasFilter ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
      >
        <CalendarIcon className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">{label()}</span>
        {hasFilter && (
          <span onClick={handleClear} className="mr-1 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 sm:p-4
            flex flex-col sm:flex-row gap-3 sm:gap-4
            w-[calc(100vw-2rem)] sm:w-max sm:min-w-[520px] sm:max-w-none"
        >
          {/* Presets */}
          <div className="flex flex-row sm:flex-col gap-1 overflow-x-auto pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-l border-slate-100 sm:pl-4 sm:min-w-[130px] shrink-0">
            <p className="text-[10px] text-slate-400 font-semibold uppercase shrink-0 self-center sm:self-auto sm:mb-1">קיצורים</p>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => handlePreset(p)}
                className="text-right text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0">
                {p.label}
              </button>
            ))}
          </div>
          {/* Calendar */}
          <div className="flex-1">
            <MiniCalendar
              viewDate={viewDate}
              setViewDate={setViewDate}
              range={range}
              onDayClick={handleDayClick}
              hovered={hovered}
              setHovered={setHovered}
            />
            {range.from && !range.to && (
              <p className="text-xs text-slate-400 text-center mt-2">בחר תאריך סיום</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}