import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { IframeAuthProvider, useAuth } from '@/lib/IframeAuthContext';
import { Loader2 } from 'lucide-react';
import { APP_VERSION } from '@/config/appVersion';
import { useState, useEffect } from 'react';

/** GitHub project site uses /repo-name/; custom domain uses /. Detect at runtime. */
function routerBasename() {
  if (typeof window === 'undefined') return undefined;
  const p = window.location.pathname;
  if (p === '/talkwithkids-v1' || p.startsWith('/talkwithkids-v1/')) {
    return '/talkwithkids-v1';
  }
  return undefined;
}

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoading, error } = useAuth();
  const [slowLoad, setSlowLoad] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const id = setTimeout(() => setSlowLoad(true), 3500);
    return () => clearTimeout(id);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#fafafa]" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500 font-medium">רק רגע, טוענים לך את הדף...</p>
        {slowLoad && (
          <p className="text-xs text-slate-400 text-center max-w-[240px] leading-relaxed">
            לוקח קצת יותר זמן מהרגיל... נסי לטעון מחדש אם זה נמשך
          </p>
        )}
      </div>
    );
  }

  if (error) {
    const isTimeout = error.code === 'TIMEOUT';
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#fafafa] px-6" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <span className="text-2xl">{isTimeout ? '⏱️' : '⚠️'}</span>
        </div>
        <div className="text-center space-y-1.5 max-w-xs">
          <p className="text-base font-semibold text-slate-800">
            {isTimeout ? 'לא ניתן להתחבר' : 'שגיאת התחברות'}
          </p>
          <p className="text-sm text-slate-500 leading-relaxed">
            {isTimeout
              ? 'הדאשבורד לא קיבל תגובה מהדף הראשי. ייתכן שיש בעיית רשת או שהדף לא נטען כראוי.'
              : (error.message && error.message !== 'timeout'
                  ? error.message
                  : 'אירעה שגיאה בעת ניסיון ההתחברות.')}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          ריענון הדף
        </button>
        <p className="text-[11px] text-slate-400 text-center max-w-xs leading-relaxed">
          אם הבעיה ממשיכה, נסה לסגור ולפתוח מחדש את הדף בוויקס
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <IframeAuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router basename={routerBasename()}>
          <div
            className="pointer-events-none fixed left-2.5 top-2.5 z-[200] select-none"
            aria-hidden
          >
            <span
              className="inline-block rounded-md border border-slate-700/20 bg-slate-900/90 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white shadow-md backdrop-blur-sm"
              dir="ltr"
              title={`גרסה ${APP_VERSION}`}
            >
              v{APP_VERSION}
            </span>
          </div>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </IframeAuthProvider>
  )
}

export default App
