import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, CheckSquare, Circle, Loader2, Tag, Link2 } from "lucide-react";

const STATUS_LABELS = { open: "פתוח", in_progress: "בטיפול", done: "הושלם" };
const STATUS_COLORS = {
  open: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
};

const TAG_COLORS = ["bg-violet-100 text-violet-700", "bg-pink-100 text-pink-700", "bg-amber-100 text-amber-700", "bg-sky-100 text-sky-700"];

export default function TasksPanel({ onClose, linkedOrderId, linkedCustomerName }) {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 50),
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => { qc.invalidateQueries(["tasks"]); setNewTitle(""); setTags([]); setShowForm(false); },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => qc.invalidateQueries(["tasks"]),
  });

  const deleteTask = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => qc.invalidateQueries(["tasks"]),
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createTask.mutate({
      title: newTitle,
      tags,
      status: "open",
      linked_order_id: linkedOrderId || "",
      linked_customer_name: linkedCustomerName || "",
    });
  };

  const cycleStatus = (task) => {
    const next = { open: "in_progress", in_progress: "done", done: "open" };
    updateTask.mutate({ id: task.id, data: { status: next[task.status] } });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
      dir="rtl"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">המשימות שלי</h3>
          <CheckSquare className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Add Task */}
      <div className="px-5 py-3 border-b border-slate-100">
        {!showForm ? (
          <button onClick={() => setShowForm(true)}
            className="w-full flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors py-1.5">
            <Plus className="w-4 h-4" />
            הוסף משימה חדשה
          </button>
        ) : (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="כותרת המשימה..." className="h-9 text-sm text-right" dir="rtl" autoFocus
              onKeyDown={e => e.key === "Enter" && handleCreate()} />
            {(linkedOrderId || linkedCustomerName) && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600">
                <Link2 className="w-3.5 h-3.5" />
                <span>{linkedOrderId && `הזמנה ${linkedOrderId}`}{linkedCustomerName && ` • ${linkedCustomerName}`}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Input value={newTag} onChange={e => setNewTag(e.target.value)}
                placeholder="הוסף תגית..." className="h-8 text-xs text-right flex-1" dir="rtl"
                onKeyDown={e => e.key === "Enter" && addTag()} />
              <button onClick={addTag} className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {tags.map((t, i) => (
                  <Badge key={t} className={`text-[11px] border-0 cursor-pointer ${TAG_COLORS[i % TAG_COLORS.length]}`}
                    onClick={() => setTags(tags.filter(x => x !== t))}>
                    {t} ×
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                onClick={handleCreate} disabled={createTask.isPending}>
                {createTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "שמור"}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowForm(false)}>ביטול</Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">אין משימות עדיין</p>
        ) : tasks.map(task => (
          <motion.div key={task.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`bg-slate-50 rounded-xl p-3 border border-slate-100 ${task.status === "done" ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-2.5">
              <button onClick={() => cycleStatus(task)} className="mt-0.5 shrink-0">
                {task.status === "done"
                  ? <CheckSquare className="w-4 h-4 text-emerald-500" />
                  : <Circle className="w-4 h-4 text-slate-300" />}
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium text-slate-700 ${task.status === "done" ? "line-through" : ""}`}>
                  {task.title}
                </span>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge className={`text-[10px] border-0 ${STATUS_COLORS[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </Badge>
                  {task.tags?.map((t, i) => (
                    <Badge key={t} className={`text-[10px] border-0 ${TAG_COLORS[i % TAG_COLORS.length]}`}>{t}</Badge>
                  ))}
                  {task.linked_order_id && (
                    <span className="text-[10px] text-blue-500 flex items-center gap-1">
                      <Link2 className="w-3 h-3" />{task.linked_order_id}
                    </span>
                  )}
                  {task.linked_customer_name && (
                    <span className="text-[10px] text-slate-400">{task.linked_customer_name}</span>
                  )}
                </div>
              </div>
              <button onClick={() => deleteTask.mutate(task.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}