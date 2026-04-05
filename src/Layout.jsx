import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import {
  LayoutDashboard, ShoppingBag, BarChart2
} from "lucide-react";
import { useAuth } from "@/lib/IframeAuthContext";

const navItems = [
  { label: "ניהול הזמנות", page: "Dashboard", icon: LayoutDashboard },
  { label: "המכירות שלי", page: "MySales", icon: ShoppingBag },
  { label: "סטטיסטיקות", page: "Statistics", icon: BarChart2 },
];

export default function Layout({ children, currentPageName }) {
  const { user } = useAuth();
  const collapsed = true;

  return (
    <div style={{ fontFamily: "'Assistant', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap');
        html { font-size: 19px; }
        * { font-family: 'Assistant', 'Helvetica Neue', sans-serif !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>

      <div className="flex min-h-screen bg-[#f8f8f8]">
        <aside
          className="w-16 bg-white border-l border-slate-200 flex flex-col shrink-0 relative z-20"
          style={{ minHeight: "100vh" }}
        >
          <div className="h-14 flex items-center justify-center border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 tracking-wide">TWK</span>
          </div>

          <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-visible">
            {navItems.map(({ label, page, icon: Icon }) => {
              const isActive = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  title={label}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                    ${isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }
                    ${collapsed ? "justify-center" : "justify-end"}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {user && (
            <div className="px-2 pb-4 border-t border-slate-100 pt-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500 mx-auto"
                title={user.displayName}
              >
                {user.displayName?.trim()?.slice(0, 2) || "TW"}
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
