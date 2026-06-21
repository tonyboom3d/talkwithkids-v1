import React, { createContext, useState, useContext, useEffect } from 'react';
import { postMessageClient } from './postMessageClient';

const IframeAuthContext = createContext();

/** מובייל / רשת איטית: ה-bundle נטען לאט; ה-timeout הקודם (8s) הספיק להיכשל לפני mount */
const AUTH_TIMEOUT_MS = 20000;

export const IframeAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [canViewOthers, setCanViewOthers] = useState(false);
  const [canGenerateInvoices, setCanGenerateInvoices] = useState(false);
  const [commissionRate, setCommissionRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let resolved = false;

    const unsubReady = postMessageClient.on('USER_READY', (payload) => {
      resolved = true;
      console.info('[TWK-AUTH] USER_READY', { user: payload.user?.displayName });
      setUser(payload.user);
      setCanViewOthers(!!payload.canViewOthers);
      setCanGenerateInvoices(!!payload.canGenerateInvoices);
      setCommissionRate(payload.commissionRate || 0);
      setIsLoading(false);
      setError(null);
    });

    const unsubError = postMessageClient.on('ERROR', (payload) => {
      if (payload.action === 'INIT' || payload.action === 'GET_USER') {
        resolved = true;
        console.error('[TWK-AUTH] ERROR from parent', payload);
        setError(payload);
        setIsLoading(false);
      }
    });

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        try {
          const ref = typeof document !== 'undefined' ? document.referrer : '';
          console.error('[TWK-AUTH] Timeout — no USER_READY', {
            ms: AUTH_TIMEOUT_MS,
            referrer: ref || '(empty)',
            hint: 'Velo re-sends USER_READY on INIT; check www vs non-www and network.',
          });
        } catch (e) {
          console.error('[TWK-AUTH] Auth timeout — no USER_READY received');
        }
        setError({ code: 'TIMEOUT', action: 'INIT', message: 'timeout' });
        setIsLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    postMessageClient.init();

    return () => {
      unsubReady();
      unsubError();
      clearTimeout(timeoutId);
      postMessageClient.destroy();
    };
  }, []);

  return (
    <IframeAuthContext.Provider value={{
      user,
      canViewOthers,
      canGenerateInvoices,
      commissionRate,
      isLoading,
      error,
    }}>
      {children}
    </IframeAuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(IframeAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an IframeAuthProvider');
  }
  return context;
};
