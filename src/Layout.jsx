import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  CheckSquare,
  LogOut,
  BarChart2,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { label: "ניהול הזמנות", page: "Dashboard", icon: ShoppingBag },
  { label: "המכירות שלי", page: "MySales", icon: BarChart2 },
  { label: "משימות", page: "Tasks", icon: CheckSquare },
  { label: "סטטיסטיקות", page: "Statistics", icon: BarChart2 },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      style={{ fontFamily: "'Assistant', 'Helvetica Neue', sans-serif" }}
      className="flex min-h-screen bg-[#fafafa]"
      dir="rtl"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap');
        * { font-family: 'Assistant', 'Helvetica Neue', sans-serif !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-l border-slate-200 min-h-screen sticky top-0 h-screen">
        <div className="px-5 py-6 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">לוח בקרה</h2>
          <p className="text-xs text-slate-400 mt-0.5">ניהול מכירות ומשימות</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 mr-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-5 border-t border-slate-100 pt-3">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>התנתקות מחשבון</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 right-0 left-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-sm font-bold text-slate-800">לוח בקרה</h2>
        <div className="w-8" />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/30 z-50"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-600" />
                </button>
                <h2 className="text-sm font-bold text-slate-800">לוח בקרה</h2>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="px-3 pb-5 border-t border-slate-100 pt-3">
                <button
                  onClick={() => base44.auth.logout()}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>התנתקות מחשבון</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}