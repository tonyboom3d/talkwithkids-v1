import { contacts } from 'wix-crm-backend';
import { normalizeIsraeliPhone } from 'backend/helpers/phoneUtils';

const LOG_PREFIX = '[VELO-BE] contacts';

/** נדרש ב-backend — בלי זה מתקבל FORBIDDEN (אין הקשר הרשאות של מבקר באתר) */
const CRM_FIND_OPTS = { suppressAuth: true };

/** מספר אנשי קשר אחרונים לסריקת contains בזיכרון (ה-API לא תומך ב-contains) */
const RECENT_FOR_CONTAINS_SCAN = 450;
const MAX_RESULTS = 30;

function mapContact(c) {
    return {
        id: c._id,
        firstName: c.info?.name?.first || '',
        lastName: c.info?.name?.last || '',
        email: c.info?.emails?.[0]?.email || c.primaryInfo?.email || '',
        phone: c.info?.phones?.[0]?.phone || c.primaryInfo?.phone || '',
    };
}

/**
 * התאמה כמו contains: שם, מייל (תת-מחרוזת), טלפון (ספרות).
 * ה-CRM מאפשר רק startsWith / eq — לכן משלימים כך.
 */
function contactMatchesContainsQuery(c, raw) {
    const q = (raw || '').trim();
    if (q.length < 2) return false;
    const qLower = q.toLowerCase();

    const first = (c.info?.name?.first || '').toLowerCase();
    const last = (c.info?.name?.last || '').toLowerCase();
    const full = `${first} ${last}`.trim();
    if (full.includes(qLower) || first.includes(qLower) || last.includes(qLower)) {
        return true;
    }

    const emails = [];
    if (c.primaryInfo?.email) emails.push(String(c.primaryInfo.email).toLowerCase());
    if (Array.isArray(c.info?.emails)) {
        for (const e of c.info.emails) {
            if (e?.email) emails.push(String(e.email).toLowerCase());
        }
    }
    for (const em of emails) {
        if (em.includes(qLower)) return true;
    }

    const qDigits = q.replace(/\D/g, '');
    if (qDigits.length >= 2) {
        const phones = [];
        if (c.primaryInfo?.phone) phones.push(String(c.primaryInfo.phone));
        if (Array.isArray(c.info?.phones)) {
            for (const p of c.info.phones) {
                if (p?.phone) phones.push(String(p.phone));
            }
        }
        for (const ph of phones) {
            const d = ph.replace(/\D/g, '');
            if (d.includes(qDigits)) return true;
            const normP = normalizeIsraeliPhone(ph);
            const normQ = normalizeIsraeliPhone(q);
            if (normP && normQ && normP === normQ) return true;
        }
    }

    return false;
}

async function safeQuery(run) {
    try {
        const r = await run();
        return r.items || [];
    } catch (err) {
        console.warn(`${LOG_PREFIX} sub-query skipped:`, err.message || err);
        return [];
    }
}

async function fetchRecentContactsForScan(limit) {
    try {
        const r = await contacts.queryContacts()
            .descending('_updatedDate')
            .limit(limit)
            .find(CRM_FIND_OPTS);
        const n = (r.items || []).length;
        console.log(`${LOG_PREFIX} recent pool fetched: ${n} items (for contains scan)`);
        return r.items || [];
    } catch (err) {
        console.warn(`${LOG_PREFIX} fetchRecentContactsForScan failed:`, err.message || err);
        return [];
    }
}

/**
 * חיפוש לקוחות: שילוב שאילתות CRM (startsWith / eq) + סריקת contains על אנשי קשר אחרונים.
 * @see https://dev.wix.com/docs/velo/apis/wix-crm-backend/contacts/sort-filter-and-search
 */
export async function searchContactsByQuery(query) {
    const raw = (query || '').trim();
    console.log(`${LOG_PREFIX} searchContactsByQuery start query=${JSON.stringify(raw)} len=${raw.length}`);

    if (raw.length < 2) {
        console.log(`${LOG_PREFIX} query too short (<2), returning []`);
        return [];
    }

    const qLower = raw.toLowerCase();
    const digits = raw.replace(/\D/g, '');
    const merged = new Map();

    const add = (items, tag) => {
        let n = 0;
        for (const c of items) {
            if (!merged.has(c._id)) n += 1;
            merged.set(c._id, c);
        }
        if (tag && n) console.log(`${LOG_PREFIX} +${n} from ${tag} (unique so far: ${merged.size})`);
    };

    const pool = await fetchRecentContactsForScan(RECENT_FOR_CONTAINS_SCAN);
    const containsHits = pool.filter((c) => contactMatchesContainsQuery(c, raw));
    add(containsHits, `contains-scan(recent ${pool.length})`);

    add(await safeQuery(() => contacts.queryContacts()
        .startsWith('info.name.first', raw)
        .limit(25)
        .find(CRM_FIND_OPTS)), 'startsWith firstName');

    add(await safeQuery(() => contacts.queryContacts()
        .startsWith('info.name.last', raw)
        .limit(25)
        .find(CRM_FIND_OPTS)), 'startsWith lastName');

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        add(await safeQuery(() => contacts.queryContacts()
            .startsWith('info.name.first', parts[0])
            .limit(25)
            .find(CRM_FIND_OPTS)), 'startsWith first word (multi)');
        add(await safeQuery(() => contacts.queryContacts()
            .startsWith('info.name.last', parts[parts.length - 1])
            .limit(25)
            .find(CRM_FIND_OPTS)), 'startsWith last word (multi)');
    }

    add(await safeQuery(() => contacts.queryContacts()
        .startsWith('info.emails.email', qLower)
        .limit(25)
        .find(CRM_FIND_OPTS)), 'startsWith info.emails.email');

    add(await safeQuery(() => contacts.queryContacts()
        .startsWith('primaryInfo.email', qLower)
        .limit(25)
        .find(CRM_FIND_OPTS)), 'startsWith primaryInfo.email');

    if (digits.length >= 2) {
        add(await safeQuery(() => contacts.queryContacts()
            .startsWith('primaryInfo.phone', digits)
            .limit(25)
            .find(CRM_FIND_OPTS)), 'startsWith primaryInfo.phone');

        add(await safeQuery(() => contacts.queryContacts()
            .startsWith('info.phones.phone', digits)
            .limit(25)
            .find(CRM_FIND_OPTS)), 'startsWith info.phones.phone');

        const normalized = normalizeIsraeliPhone(raw);
        if (normalized) {
            add(await safeQuery(() => contacts.queryContacts()
                .eq('primaryInfo.phone', normalized)
                .limit(25)
                .find(CRM_FIND_OPTS)), 'eq primaryInfo.phone normalized');

            add(await safeQuery(() => contacts.queryContacts()
                .eq('info.phones.phone', normalized)
                .limit(25)
                .find(CRM_FIND_OPTS)), 'eq info.phones.phone normalized');
        }
    }

    const out = [...merged.values()].slice(0, MAX_RESULTS).map(mapContact);
    console.log(`${LOG_PREFIX} searchContactsByQuery done total=${out.length} (merged unique contacts: ${merged.size})`);
    return out;
}

export async function findContactByEmail(email) {
    if (!email) return null;
    try {
        const results = await contacts.queryContacts()
            .eq('info.emails.email', email)
            .find(CRM_FIND_OPTS);
        return results.items.length > 0 ? results.items[0] : null;
    } catch (err) {
        console.error(`${LOG_PREFIX} findContactByEmail error:`, err);
        return null;
    }
}

export async function createContact(contactData) {
    try {
        const normalizedPhone = contactData.phone ? normalizeIsraeliPhone(contactData.phone) : "";
        const result = await contacts.createContact({
            name: { first: contactData.firstName, last: contactData.lastName },
            emails: contactData.email ? [{ email: contactData.email }] : [],
            phones: contactData.phone ? [{ phone: normalizedPhone || contactData.phone }] : [],
        });
        return result;
    } catch (err) {
        console.error(`${LOG_PREFIX} createContact error:`, err);
        throw err;
    }
}
