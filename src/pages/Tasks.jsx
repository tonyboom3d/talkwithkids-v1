import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Plus, X, Tag, User, ShoppingBag,
  CheckCircle2, Circle, ChevronDown, StickyNote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DEMO_ORDERS, DEMO_CUSTOMERS } from "../components/dashboard/DemoDataProvider";
import moment from "moment";

const TAG_OPTIONS = [
  { label: "דחוף", color: "bg-red-100 text-red-700" },
  { label: "ממתין לתשלום", color: "bg-amber-100 text-amber-700" },
  { label: "מעקב", color: "bg-blue-100 text-blue-700" },
  { label: "לקוח חדש", color: "bg-violet-100 text-violet-700" },
  { label: "סגור", color: "bg-emerald-100 text-emerald-700" },
];

const INIT_TASKS = [
  {
    id: "t1", text: "לעקוב אחר תשלום של מיכל לוי", done: false,
    tags: ["ממתין לתשלום", "מעקב"],
    linkedOrder: DEMO_ORDERS[1],
    linkedCustomer: null,
    date: new Date().toISOString(),
  },
  {
    id: "t2", text: "לשלוח הצעת מחיר לרונית דוד", done: false,
    tags: ["דחוף"],
    linkedOrder: null,
    linkedCustomer: DEMO_CUSTOMERS[3],
    date: new Date().toISOString(),
  },
];

function TagBadge({ label }) {
  const found = TAG_OPTIONS.find(t => t.label === label);
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${found?.color || "bg-slate-100 text-slate-500"}`}>
      {label}
    </span>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState(INIT_TASKS);
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newTags, setNewTags] = useState([]);
  const [linkedOrder, setLinkedOrder] = useState("");
  const [linkedCustomer, setLinkedCustomer] = useState("");
  const [filter, setFilter] = useState("all");

  const addTask = () => {
    if (!newText.trim()) return;
    const order = DEMO_ORDERS.find(o => o.id === linkedOrder) || null;
    const customer = DEMO_CUSTOMERS.find(c => c.id === linkedCustomer) || null;
    setTasks(prev => [{
      id: `t-${Date.now()}`,
      text: newText,
      done: false,
      tags: newTags,
      linkedOrder: order,
      linkedCustomer: customer,
      date: new Date().toISOString(),
    }, ...prev]);
    setNewText(""); setNewTags([]); setLinkedOrder(""); setLinkedCustomer(""); setShowForm(false);
  };

  const toggleDone = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleTag = (tag) => {
    setNewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filtered = tasks.filter(t => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fafafa] p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">משימות</h1>
            <p className="text-sm text-slate-400 mt-0.5">ניהול המשימות שלך</p>
          </div>
          <Button onClick={() => setShowForm(v => !v)} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm rounded-xl">
            <Plus className="w-4 h-4" />
            משימה חדשה
          </Button>
        </motion.div>

        {/* Add Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-4">
                <Textarea
                  placeholder="תיאור המשימה..."
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  className="min-h-[70px] text-sm border-slate-200 resize-none"
                  dir="rtl"
                  autoFocus
                />

                {/* Tags */}
                <div>
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> תגיות</p>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map(t => (
                      <button
                        key={t.label}
                        onClick={() => toggleTag(t.label)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                          newTags.includes(t.label) ? `${t.color} border-transparent` : "bg-white border-slate-200 text-slate-500"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Link Order */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" /> שייך הזמנה</p>
                    <select
                      value={linkedOrder}
                      onChange={e => setLinkedOrder(e.target.value)}
                      className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700 focus:outline-none"
                      dir="rtl"
                    >
                      <option value="">ללא</option>
                      {DEMO_ORDERS.map(o => (
                        <option key={o.id} value={o.id}>{o.id} – {o.customer.firstName} {o.customer.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1"><User className="w-3.5 h-3.5" /> שייך לקוח</p>
                    <select
                      value={linkedCustomer}
                      onChange={e => setLinkedCustomer(e.target.value)}
                      className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700 focus:outline-none"
                      dir="rtl"
                    >
                      <option value="">ללא</option>
                      {DEMO_CUSTOMERS.map(c => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setShowForm(false)}>ביטול</Button>
                  <Button size="sm" className="text-xs h-8 bg-slate-800 hover:bg-slate-700 text-white" onClick={addTask}>שמור משימה</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter */}
        <div className="flex gap-2">
          {[{ v: "all", l: "הכל" }, { v: "active", l: "פעילות" }, { v: "done", l: "הושלמו" }].map(f => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filter === f.v ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {f.l}
            </button>
          ))}
          <span className="text-xs text-slate-400 flex items-center mr-auto">{filtered.length} משימות</span>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(task => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`bg-white rounded-2xl border shadow-sm p-4 space-y-3 transition-opacity ${task.done ? "opacity-60 border-slate-100" : "border-slate-200/60"}`}
              >
                <div className="flex items-start gap-3">
                  <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-400 transition-colors mt-0.5 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                  <p className={`flex-1 text-sm text-right leading-relaxed ${task.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                    {task.text}
                  </p>
                  <button onClick={() => toggleDone(task.id)} className="shrink-0 mt-0.5">
                    {task.done
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500 transition-colors" />
                    }
                  </button>
                </div>

                {/* Tags */}
                {task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pr-8">
                    {task.tags.map(tag => <TagBadge key={tag} label={tag} />)}
                  </div>
                )}

                {/* Links */}
                {(task.linkedOrder || task.linkedCustomer) && (
                  <div className="flex flex-wrap gap-2 pr-8">
                    {task.linkedOrder && (
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                        <ShoppingBag className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] text-slate-600">{task.linkedOrder.id}</span>
                      </div>
                    )}
                    {task.linkedCustomer && (
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] text-slate-600">{task.linkedCustomer.firstName} {task.linkedCustomer.lastName}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-slate-400 text-left pr-8">
                  {moment(task.date).format("DD/MM/YY HH:mm")}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">אין משימות להצגה</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}