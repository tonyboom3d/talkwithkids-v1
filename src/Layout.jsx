import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, CheckSquare, BarChart2, LogOut, Menu, X, ClipboardList
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { label: "ניהול הזמנות", page: "Dashboard", icon: LayoutDashboard },
  { label: "המכירות שלי", page: "MySales", icon: ShoppingBag },
  { label: "משימות", page: "Tasks", icon: CheckSquare },
  { label: "סטטיסטיקות", page: "Statistics", icon: BarChart2 },
];

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ fontFamily: "'Assistant', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap');
        * { font-family: 'Assistant', 'Helvetica Neue', sans-serif !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>

      <div className="flex min-h-screen bg-[#f8f8f8]">
        {/* Sidebar - Right side */}
        <motion.aside
          animate={{ width: collapsed ? 64 : 220 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="bg-white border-l border-slate-200 flex flex-col shrink-0 relative z-20"
          style={{ minHeight: "100vh" }}
        >
          {/* Logo / Toggle */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            >
              {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
            {!collapsed && (
              <span className="text-sm font-bold text-slate-800 truncate">לוח בקרה</span>
            )}
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-3 space-y-0.5 px-2">
            {navItems.map(({ label, page, icon: Icon }) => {
              const isActive = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                    ${isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }
                    ${collapsed ? "justify-center" : "justify-end"}`}
                >
                  {!collapsed && <span className="truncate">{label}</span>}
                  <Icon className="w-4 h-4 shrink-0" />
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-2 pb-4 border-t border-slate-100 pt-3">
            <button
              title={collapsed ? "התנתקות" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors
                ${collapsed ? "justify-center" : "justify-end"}`}
            >
              {!collapsed && <span>התנתקות</span>}
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}