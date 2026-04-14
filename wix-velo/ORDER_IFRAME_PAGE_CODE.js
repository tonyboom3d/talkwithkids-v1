import wixLocation from 'wix-location';
import { getPublicOrderForIframe, createPublicCheckoutForOrder } from 'backend/publicOrderApi.jsw';

const MESSAGE_TYPE = 'TWK_PUBLIC_ORDER_IFRAME';
const HTML_COMPONENT_ID = '#html1';

/** מזהה מהפרמטר ?id= ; תאימות לאחור: מקטע אחרון בנתיב */
function extractPublicOrderIdFromCurrentUrl() {
    try {
        const currentUrl = new URL(wixLocation.url);
        const fromQuery = currentUrl.searchParams.get('id');
        if (fromQuery && String(fromQuery).trim()) {
            return decodeURIComponent(String(fromQuery).trim());
        }
        const segments = currentUrl.pathname.split('/').filter(Boolean);
        return segments.length ? decodeURIComponent(segments[segments.length - 1]) : '';
    } catch (err) {
        console.error('[ORDER-IFRAME] Failed to parse order id from URL:', err);
        return '';
    }
}

function postToIframe(action, payload = {}) {
    $w(HTML_COMPONENT_ID).postMessage({
        type: MESSAGE_TYPE,
        action,
        payload,
    });
}

async function sendOrderToIframe() {
    const publicOrderId = extractPublicOrderIdFromCurrentUrl();
    console.log('[ORDER-IFRAME] extracted public order id from URL:', publicOrderId);

    if (!publicOrderId) {
        console.warn('[ORDER-IFRAME] missing id in URL');
        postToIframe('ORDER_ERROR', {
            message: 'אופס... לא מצאתי את ההזמנה שלך',
            code: 'MISSING_ORDER_ID',
            debug: {
                reason: 'missing_dynamic_link_id_in_browser_url',
                currentUrl: wixLocation.url,
            },
        });
        return;
    }

    const result = await getPublicOrderForIframe(publicOrderId);
    console.log('[ORDER-IFRAME] backend result:', result);

    if (!result?.ok || !result.order) {
        console.error('[ORDER-IFRAME] order lookup failed:', {
            code: result?.code || 'UNKNOWN_ERROR',
            message: result?.message || 'אופס... לא מצאתי את ההזמנה שלך',
            debug: result?.debug || null,
        });
        postToIframe('ORDER_ERROR', {
            code: result?.code || 'UNKNOWN_ERROR',
            message: result?.message || 'אופס... לא מצאתי את ההזמנה שלך',
            debug: result?.debug || null,
        });
        return;
    }

    console.log('[ORDER-IFRAME] sending order payload to iframe:', result.order);
    postToIframe('ORDER_DATA', result.order);
}

$w.onReady(function () {
    let initialized = false;
    let checkoutInProgress = false;

    $w(HTML_COMPONENT_ID).onMessage(async (event) => {
        const data = event.data || {};
        console.log('[ORDER-IFRAME] message from html component:', data);
        if (data.type !== MESSAGE_TYPE) return;

        if (data.action === 'IFRAME_READY') {
            if (initialized) return;
            initialized = true;
            await sendOrderToIframe();
            return;
        }

        if (data.action === 'REQUEST_CHECKOUT') {
            if (checkoutInProgress) {
                console.log('[ORDER-IFRAME] checkout already in progress, ignoring duplicate request');
                return;
            }
            checkoutInProgress = true;
            console.log('[ORDER-IFRAME] REQUEST_CHECKOUT received, generating checkout...');

            const publicOrderId = extractPublicOrderIdFromCurrentUrl();
            const result = await createPublicCheckoutForOrder(publicOrderId);
            checkoutInProgress = false;

            if (!result?.ok || !result.checkoutUrl) {
                console.error('[ORDER-IFRAME] checkout creation failed:', result);
                postToIframe('CHECKOUT_ERROR', {
                    message: result?.message || 'אירעה שגיאה ביצירת קישור התשלום. נסי שוב.',
                    code: result?.code || 'CHECKOUT_CREATION_FAILED',
                });
                return;
            }

            console.log('[ORDER-IFRAME] checkout created, redirecting to:', result.checkoutUrl);
            wixLocation.to(result.checkoutUrl);
        }
    });
});
