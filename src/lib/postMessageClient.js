/** מקור דף האם בוויקס (iframe). כשפותחים את הדאשבורד ישירות ב-GitHub Pages, parent הוא אותו חלון — חייבים targetOrigin תואם. */
const WIX_PARENT_ORIGIN = 'https://www.talkwithkids.co.il';
/** וויקס לעיתים מגיש apex ללא www; postMessage דורש התאמה מדויקת ל־origin של החלון האב */
const WIX_PARENT_ORIGINS = [WIX_PARENT_ORIGIN, 'https://talkwithkids.co.il'];
const MSG_TYPE = 'TWK_MSG';

let requestIdCounter = 0;
const pendingRequests = new Map();
const listeners = new Map();

function postMessageTargetOrigin() {
  if (typeof window === 'undefined') return WIX_PARENT_ORIGIN;
  // טאב רגיל / אותו מקור — אחרת postMessage נכשל (targetOrigin חייב להתאים ל-recipient)
  if (window.parent === window) {
    return window.location.origin;
  }
  const fromEnv = import.meta.env.VITE_POST_MESSAGE_TARGET_ORIGIN;
  if (fromEnv) return fromEnv;
  try {
    const ref = document.referrer;
    if (ref) {
      const o = new URL(ref).origin;
      if (WIX_PARENT_ORIGINS.includes(o)) return o;
    }
  } catch (e) {
    /* ignore */
  }
  return WIX_PARENT_ORIGIN;
}

function isTrustedMessageOrigin(origin) {
  if (origin === window.location.origin) return true;
  if (WIX_PARENT_ORIGINS.includes(origin)) return true;
  const extra = import.meta.env.VITE_EXTRA_ALLOWED_MESSAGE_ORIGINS;
  if (extra) {
    return extra.split(',').map((s) => s.trim()).includes(origin);
  }
  return false;
}

function generateRequestId() {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

function handleMessage(event) {
  if (!isTrustedMessageOrigin(event.origin)) return;

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
  try {
    const standalone = typeof window !== 'undefined' && window.parent === window;
    const targetOrigin = postMessageTargetOrigin();
    const ref = typeof document !== 'undefined' ? document.referrer : '';
    console.info('[TWK-MSG] init', {
      standalone,
      postTargetOrigin: targetOrigin,
      referrerSnippet: ref ? ref.slice(0, 160) : '(empty)',
    });
  } catch (e) {
    console.warn('[TWK-MSG] init diagnostic failed', e);
  }
  send('INIT');
}

function destroy() {
  window.removeEventListener('message', handleMessage);
  pendingRequests.forEach(({ timer }) => clearTimeout(timer));
  pendingRequests.clear();
}

function send(action, payload = {}) {
  const targetOrigin = postMessageTargetOrigin();
  window.parent.postMessage(
    { type: MSG_TYPE, action, payload },
    targetOrigin
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

    const targetOrigin = postMessageTargetOrigin();
    window.parent.postMessage(
      { type: MSG_TYPE, action, requestId, payload },
      targetOrigin
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
  /** @deprecated השתמש ב-postMessageTargetOrigin דרך הקוד הפנימי; נשמר לתאימות */
  get WIX_ORIGIN() {
    return WIX_PARENT_ORIGIN;
  },
  postMessageTargetOrigin,
};
