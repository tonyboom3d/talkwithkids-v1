const WIX_ORIGIN = 'https://www.talkwithkids.co.il';
const MSG_TYPE = 'TWK_MSG';

let requestIdCounter = 0;
const pendingRequests = new Map();
const listeners = new Map();

function generateRequestId() {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

function handleMessage(event) {
  if (event.origin !== WIX_ORIGIN) return;

  const data = event.data;
  if (!data || data.type !== MSG_TYPE) return;

  const { action, requestId, payload } = data;

  if (requestId && pendingRequests.has(requestId)) {
    const { resolve, reject, timer } = pendingRequests.get(requestId);
    clearTimeout(timer);
    pendingRequests.delete(requestId);
    if (action === 'ERROR') {
      reject(payload);
    } else {
      resolve(payload);
    }
    return;
  }

  const callbacks = listeners.get(action);
  if (callbacks) {
    callbacks.forEach(cb => cb(payload));
  }
}

function init() {
  window.addEventListener('message', handleMessage);
  send('INIT');
}

function destroy() {
  window.removeEventListener('message', handleMessage);
  pendingRequests.forEach(({ timer }) => clearTimeout(timer));
  pendingRequests.clear();
}

function send(action, payload = {}) {
  window.parent.postMessage(
    { type: MSG_TYPE, action, payload },
    WIX_ORIGIN
  );
}

function request(action, payload = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const requestId = generateRequestId();
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject({ code: 'TIMEOUT', message: `Request ${action} timed out` });
    }, timeoutMs);

    pendingRequests.set(requestId, { resolve, reject, timer });

    window.parent.postMessage(
      { type: MSG_TYPE, action, requestId, payload },
      WIX_ORIGIN
    );
  });
}

function on(action, callback) {
  if (!listeners.has(action)) {
    listeners.set(action, new Set());
  }
  listeners.get(action).add(callback);
  return () => listeners.get(action)?.delete(callback);
}

export const postMessageClient = {
  init,
  destroy,
  send,
  request,
  on,
  WIX_ORIGIN,
};
