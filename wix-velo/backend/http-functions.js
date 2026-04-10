import wixData from 'wix-data';
import { ok, badRequest, serverError } from 'wix-http-functions';
import { getSecret } from 'wix-secrets-backend';

const LOG_PREFIX = '[HTTP-WHATSAPP]';
const WHATSAPP_WEBHOOK_SECRET_NAME = 'WHATSAPP_WEBHOOK_API_KEY';

function safeParseJson(value, fallback) {
    if (value == null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch (err) {
        return fallback;
    }
}

function extractDynamicLinkIdFromPaymentLink(paymentLink) {
    const raw = String(paymentLink || '').trim();
    if (!raw) return '';
    try {
        const url = new URL(raw);
        const fromQuery = url.searchParams.get('id');
        if (fromQuery && String(fromQuery).trim()) {
            return decodeURIComponent(String(fromQuery).trim());
        }
        const segments = url.pathname.split('/').filter(Boolean);
        return segments.length ? decodeURIComponent(String(segments[segments.length - 1]).trim()) : '';
    } catch (err) {
        return '';
    }
}

function getHeaderValue(headers, ...keys) {
    if (!headers) return '';
    for (const key of keys) {
        if (key == null) continue;
        const direct = headers[key];
        if (direct != null && String(direct).trim()) return String(direct).trim();
        const lower = headers[String(key).toLowerCase()];
        if (lower != null && String(lower).trim()) return String(lower).trim();
    }
    return '';
}

function normalizeWhatsappResult(payload) {
    if (payload?.success === false || payload?.ok === false) {
        return {
            status: 'failed',
            errorMessage: String(payload?.errorMessage || payload?.error || payload?.message || '').trim(),
            providerMessageId: String(payload?.providerMessageId || payload?.messageId || '').trim(),
        };
    }

    const statusRaw = String(payload?.status ?? payload?.result ?? '').trim().toLowerCase();
    const okBool = payload?.ok === true || payload?.success === true;

    const status = okBool || statusRaw === 'success' || statusRaw === 'sent' || statusRaw === 'delivered'
        ? 'success'
        : (statusRaw === 'fail' || statusRaw === 'failed' || statusRaw === 'error' ? 'failed' : '');

    return {
        status,
        errorMessage: String(payload?.errorMessage || payload?.error || payload?.message || '').trim(),
        providerMessageId: String(payload?.providerMessageId || payload?.messageId || '').trim(),
    };
}

function overwriteLatestWhatsappPendingEvent(changeChain, resultStatus, nowIso) {
    const chain = Array.isArray(changeChain) ? [...changeChain] : [];
    const pendingIdx = (() => {
        for (let i = chain.length - 1; i >= 0; i -= 1) {
            const action = chain[i]?.action || chain[i]?.type;
            if (action === 'whatsapp_pending') return i;
        }
        return -1;
    })();

    const nextEvent = {
        action: resultStatus === 'success' ? 'whatsapp_sent_success' : 'whatsapp_sent_failed',
        by: 'מערכת',
        date: nowIso,
        detail: resultStatus === 'success' ? 'שליחת וואטסאפ נשלחה' : 'שליחת וואטסאפ נכשלה',
    };

    if (pendingIdx >= 0) {
        chain[pendingIdx] = nextEvent;
        return chain;
    }

    chain.push(nextEvent);
    return chain;
}

/** Query params are always strings; normalize booleans */
function parseQueryBool(value) {
    if (value === true || value === false) return value;
    const s = String(value ?? '').trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
    return undefined;
}

function firstDefinedValue(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
}

async function readJsonBody(request) {
    try {
        return await request.body.json();
    } catch (err) {
        return {};
    }
}

function buildPayload(request, body = {}) {
    const q = request.query || {};
    const headers = request.headers || {};
    const success = parseQueryBool(firstDefinedValue(body.success, q.success, getHeaderValue(headers, 'success')));
    const okVal = parseQueryBool(firstDefinedValue(body.ok, q.ok, getHeaderValue(headers, 'ok')));

    return {
        paymentLink: firstDefinedValue(
            body.paymentLink,
            body.payment_link,
            q.paymentLink,
            q.payment_link,
            getHeaderValue(headers, 'paymentLink', 'paymentlink', 'payment_link')
        ) || '',
        ...(success !== undefined ? { success } : {}),
        ...(okVal !== undefined ? { ok: okVal } : {}),
        status: firstDefinedValue(body.status, body.result, q.status, q.result, getHeaderValue(headers, 'status', 'result')) || '',
        errorMessage: firstDefinedValue(
            body.errorMessage,
            body.error,
            body.message,
            q.errorMessage,
            q.error,
            q.message,
            getHeaderValue(headers, 'errorMessage', 'errormessage', 'error', 'message')
        ) || '',
        providerMessageId: firstDefinedValue(
            body.providerMessageId,
            body.messageId,
            q.providerMessageId,
            q.messageId,
            getHeaderValue(headers, 'providerMessageId', 'providermessageid', 'messageId', 'messageid')
        ) || '',
        contact: {
            id: firstDefinedValue(body.contact?.id, body.contactId, body.id, q.contactId, q.id, getHeaderValue(headers, 'contactId', 'contactid', 'id')) || '',
            name: firstDefinedValue(body.contact?.name, body.contactName, body.name, q.contactName, q.name, getHeaderValue(headers, 'contactName', 'contactname', 'name')) || '',
            email: firstDefinedValue(body.contact?.email, body.contactEmail, body.email, q.contactEmail, q.email, getHeaderValue(headers, 'contactEmail', 'contactemail', 'email')) || '',
            phone: firstDefinedValue(body.contact?.phone, body.contactPhone, body.phone, q.contactPhone, q.phone, getHeaderValue(headers, 'contactPhone', 'contactphone', 'phone')) || '',
        },
    };
}

async function isAuthorized(request) {
    const query = request.query || {};
    const fromQuery = String(query.apiKey || query.key || '').trim();

    const headerKey = getHeaderValue(request.headers, 'x-api-key', 'x_api_key');

    const provided = String(fromQuery || headerKey || '').trim();
    if (!provided) return false;

    const expected = String(await getSecret(WHATSAPP_WEBHOOK_SECRET_NAME) || '').trim();
    if (!expected) {
        console.warn(`${LOG_PREFIX} Missing secret "${WHATSAPP_WEBHOOK_SECRET_NAME}" in Secrets Manager`);
        return false;
    }
    return provided === expected;
}

async function processWhatsappCallback(payload) {
    const paymentLink = payload?.paymentLink || payload?.contact?.dynamic_payment_link || '';
    const dynamicLinkId = extractDynamicLinkIdFromPaymentLink(paymentLink);

    if (!dynamicLinkId) {
        return {
            response: badRequest,
            data: { ok: false, error: 'MISSING_DYNAMIC_LINK_ID' },
        };
    }

    const result = normalizeWhatsappResult(payload);
    if (!result.status) {
        return {
            response: badRequest,
            data: { ok: false, error: 'MISSING_STATUS' },
        };
    }

    const records = await wixData.query('DashboardOrders')
        .eq('dynamicLinkId', dynamicLinkId)
        .limit(1)
        .find({ suppressAuth: true });

    if (!records.items.length) {
        return {
            response: ok,
            data: { ok: true, found: false, dynamicLinkId },
        };
    }

    const record = records.items[0];
    const chain = safeParseJson(record.changeChain, []);

    const contact = payload?.contact || {};
    const nowIso = new Date().toISOString();
    const whatsappData = {
        status: result.status,
        messageId: result.providerMessageId,
        error: result.status === 'failed' ? result.errorMessage : '',
        updatedAt: nowIso,
        paymentLink: paymentLink,
        dynamicLinkId,
        contact: {
            id: String(contact.id || '').trim(),
            name: String(contact.name || '').trim(),
            email: String(contact.email || '').trim(),
            phone: String(contact.phone || '').trim(),
        },
    };

    const nextChain = overwriteLatestWhatsappPendingEvent(chain, result.status, nowIso);

    await wixData.update('DashboardOrders', {
        ...record,
        changeChain: JSON.stringify(nextChain),
        whatsappData: JSON.stringify(whatsappData),
    }, { suppressAuth: true });

    console.log(`${LOG_PREFIX} updated record ${record._id} dynamicLinkId=${dynamicLinkId} status=${result.status}`);

    return {
        response: ok,
        data: { ok: true, found: true, recordId: record._id, dynamicLinkId },
    };
}

function jsonResponse(fn, data) {
    return fn({
        headers: { 'Content-Type': 'application/json' },
        body: data,
    });
}

/**
 * GET /_functions/whatsappCallback?apiKey=...&paymentLink=...&success=true|false
 *
 * Query params (כל הפרמטרים ב-query string):
 * - apiKey (או key) — חובה אם לא נשלח x-api-key ב-header
 * - paymentLink — קישור עם ?id=... ל-dynamicLinkId
 * - success או ok — true / false
 * - status — success | failed | error (חלופי ל-success)
 * - errorMessage — בכשל
 * - providerMessageId / messageId — אופציונלי
 * - contactId, contactName, contactEmail, contactPhone — או id, name, email, phone
 */
export async function get_whatsappCallback(request) {
    try {
        const authorized = await isAuthorized(request);
        if (!authorized) {
            return jsonResponse(badRequest, { ok: false, error: 'UNAUTHORIZED' });
        }

        const payload = buildPayload(request, {});
        const outcome = await processWhatsappCallback(payload);
        return jsonResponse(outcome.response, outcome.data);
    } catch (err) {
        console.error(`${LOG_PREFIX} failed:`, err);
        return jsonResponse(serverError, { ok: false, error: 'SERVER_ERROR' });
    }
}

export async function post_whatsappCallback(request) {
    try {
        const authorized = await isAuthorized(request);
        if (!authorized) {
            return jsonResponse(badRequest, { ok: false, error: 'UNAUTHORIZED' });
        }

        const body = await readJsonBody(request);
        const payload = buildPayload(request, body);
        const outcome = await processWhatsappCallback(payload);
        return jsonResponse(outcome.response, outcome.data);
    } catch (err) {
        console.error(`${LOG_PREFIX} failed:`, err);
        return jsonResponse(serverError, { ok: false, error: 'SERVER_ERROR' });
    }
}
