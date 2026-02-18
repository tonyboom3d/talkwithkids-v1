import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckSquare, Circle, Loader2, Tag, Link2, X, Trash2 } from "lucide-react";

const STATUS_LABELS = { open: "פתוח", in_progress: "בטיפול", done: "הושלם" };
const STATUS_COLORS = {
  open: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
};
const TAG_COLORS = ["bg-violet-100 text-violet-700", "bg-pink-100 text-pink-700", "bg-amber-100 text-amber-700", "bg-sky-100 text-sky-700"];

export default function Tasks() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 100),
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
    createTask.mutate({ title: newTitle, tags, status: "open" });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const cycleStatus = (task) => {
    const next = { open: "in_progress", in_progress: "done", done: "open" };
    updateTask.mutate({ id: task.id, data: { status: next[task.status] } });
  };

  const filtered = filterStatus === "all" ? tasks : tasks.filter(t => t.status === filterStatus);
  const openCount = tasks.filter(t => t.status === "open").length;
  const doneCount = tasks.filter(t => t.status === "done").length;

  return (
    <div className="min-h-screen bg-[#f8f8f8] p-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">המשימות שלי</h1>
            <p className="text-sm text-slate-400 mt-0.5">{openCount} פתוחות • {doneCount} הושלמו</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-9">
            <Plus className="w-4 h-4" />
            משימה חדשה
          </Button>
        </motion.div>

        {/* New Task Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-3">
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="כותרת המשימה..." className="h-10 text-sm text-right" dir="rtl" autoFocus
                onKeyDown={e => e.key === "Enter" && handleCreate()} />
              <div className="flex gap-2">
                <Input value={newTag} onChange={e => setNewTag(e.target.value)}
                  placeholder="הוסף תגית ולחץ Enter..." className="h-9 text-sm text-right flex-1" dir="rtl"
                  onKeyDown={e => e.key === "Enter" && addTag()} />
                <button onClick={addTag} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200">
                  <Tag className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {tags.map((t, i) => (
                    <Badge key={t} className={`text-xs border-0 cursor-pointer ${TAG_COLORS[i % TAG_COLORS.length]}`}
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
        </AnimatePresence>

        {/* Filters */}
        <div className="flex gap-2">
          {[["all", "הכל"], ["open", "פתוחות"], ["in_progress", "בטיפול"], ["done", "הושלמו"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border
                ${filterStatus === val ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">אין משימות להצגה</div>
          ) : filtered.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 flex items-start gap-3 ${task.status === "done" ? "opacity-60" : ""}`}>
              <button onClick={() => cycleStatus(task)} className="mt-0.5 shrink-0">
                {task.status === "done"
                  ? <CheckSquare className="w-5 h-5 text-emerald-500" />
                  : <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-slate-700 ${task.status === "done" ? "line-through" : ""}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
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
              <button onClick={() => deleteTask.mutate(task.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}