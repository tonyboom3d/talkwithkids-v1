import React, { createContext, useState, useContext, useEffect } from 'react';
import { postMessageClient } from './postMessageClient';

const IframeAuthContext = createContext();

const AUTH_TIMEOUT_MS = 8000;

export const IframeAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [canViewOthers, setCanViewOthers] = useState(false);
  const [commissionRate, setCommissionRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let resolved = false;

    const unsubReady = postMessageClient.on('USER_READY', (payload) => {
      resolved = true;
      console.log('[UI] User ready:', payload.user?.displayName);
      setUser(payload.user);
      setCanViewOthers(!!payload.canViewOthers);
      setCommissionRate(payload.commissionRate || 0);
      setIsLoading(false);
      setError(null);
    });

    const unsubError = postMessageClient.on('ERROR', (payload) => {
      if (payload.action === 'INIT' || payload.action === 'GET_USER') {
        resolved = true;
        console.error('[UI] Auth error:', payload.message);
        setError(payload);
        setIsLoading(false);
      }
    });

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        console.error('[UI] Auth timeout — no USER_READY received');
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
