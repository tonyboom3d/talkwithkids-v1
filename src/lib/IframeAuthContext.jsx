import React, { createContext, useState, useContext, useEffect } from 'react';
import { postMessageClient } from './postMessageClient';

const IframeAuthContext = createContext();

export const IframeAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [canViewOthers, setCanViewOthers] = useState(false);
  const [commissionRate, setCommissionRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubReady = postMessageClient.on('USER_READY', (payload) => {
      console.log('[UI] User ready:', payload.user?.displayName);
      setUser(payload.user);
      setCanViewOthers(!!payload.canViewOthers);
      setCommissionRate(payload.commissionRate || 0);
      setIsLoading(false);
      setError(null);
    });

    const unsubError = postMessageClient.on('ERROR', (payload) => {
      if (payload.action === 'INIT' || payload.action === 'GET_USER') {
        console.error('[UI] Auth error:', payload.message);
        setError(payload);
        setIsLoading(false);
      }
    });

    postMessageClient.init();

    return () => {
      unsubReady();
      unsubError();
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
