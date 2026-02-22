import { useState, useCallback, useEffect, useRef } from 'react';
import { postMessageClient } from '@/lib/postMessageClient';

export function usePostMessage() {
  const send = useCallback((action, payload) => {
    postMessageClient.send(action, payload);
  }, []);

  const request = useCallback((action, payload, timeoutMs) => {
    return postMessageClient.request(action, payload, timeoutMs);
  }, []);

  return { send, request };
}

export function usePostMessageRequest(action, payload, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (overridePayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await postMessageClient.request(action, overridePayload || payload);
      if (mountedRef.current) {
        setData(result);
        setIsLoading(false);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setIsLoading(false);
      }
      throw err;
    }
  }, [action, payload]);

  useEffect(() => {
    if (enabled) {
      execute();
    }
  }, [enabled]);

  return { data, isLoading, error, execute, setData };
}

export function usePostMessageListener(action, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsub = postMessageClient.on(action, (payload) => {
      callbackRef.current(payload);
    });
    return unsub;
  }, [action]);
}
