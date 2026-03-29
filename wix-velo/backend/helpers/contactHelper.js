import { contacts } from 'wix-crm-backend';
import { normalizeIsraeliPhone } from 'backend/helpers/phoneUtils';

function mapContact(c) {
    return {
        id: c._id,
        firstName: c.info?.name?.first || '',
        lastName: c.info?.name?.last || '',
        email: c.info?.emails?.[0]?.email || c.primaryInfo?.email || '',
        phone: c.info?.phones?.[0]?.phone || c.primaryInfo?.phone || '',
    };
}

async function safeQuery(run) {
    try {
        const r = await run();
        return r.items || [];
    } catch (err) {
        console.warn('[VELO-BE] Contact sub-query skipped:', err.message || err);
        return [];
    }
}

/**
 * חיפוש לקוחות — רק פילטרים שנתמכים ב-CRM: startsWith / eq (לא contains).
 * @see https://dev.wix.com/docs/velo/api-reference/wix-crm-backend/contacts/sort-filter-and-search
 */
export async function searchContactsByQuery(query) {
    const raw = (query || '').trim();
    if (raw.length < 2) return [];

    const qLower = raw.toLowerCase();
    const digits = raw.replace(/\D/g, '');
    const merged = new Map();

    const add = (items) => {
        for (const c of items) {
            merged.set(c._id, c);
        }
    };

    add(await safeQuery(() => contacts.queryContacts()
        .startsWith('info.name.first', raw)
        .limit(25)
        .find()));

    add(await safeQuery(() => contacts.queryContacts()
        .startsWith('info.name.last', raw)
        .limit(25)
        .find()));

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        add(await safeQuery(() => contacts.queryContacts()
            .startsWith('info.name.first', parts[0])
            .limit(25)
            .find()));
        add(await safeQuery(() => contacts.queryContacts()
            .startsWith('info.name.last', parts[parts.length - 1])
            .limit(25)
            .find()));
    }

    add(await safeQuery(() => contacts.queryContacts()
        .startsWith('info.emails.email', qLower)
        .limit(25)
        .find()));

    add(await safeQuery(() => contacts.queryContacts()
        .startsWith('primaryInfo.email', qLower)
        .limit(25)
        .find()));

    if (digits.length >= 2) {
        add(await safeQuery(() => contacts.queryContacts()
            .startsWith('primaryInfo.phone', digits)
            .limit(25)
            .find()));

        add(await safeQuery(() => contacts.queryContacts()
            .startsWith('info.phones.phone', digits)
            .limit(25)
            .find()));

        const normalized = await normalizeIsraeliPhone(raw);
        if (normalized) {
            add(await safeQuery(() => contacts.queryContacts()
                .eq('primaryInfo.phone', normalized)
                .limit(25)
                .find()));
            add(await safeQuery(() => contacts.queryContacts()
                .eq('info.phones.phone', normalized)
                .limit(25)
                .find()));
        }
    }

    return [...merged.values()].slice(0, 30).map(mapContact);
}

export async function findContactByEmail(email) {
    if (!email) return null;
    try {
        const results = await contacts.queryContacts()
            .eq('info.emails.email', email)
            .find();
        return results.items.length > 0 ? results.items[0] : null;
    } catch (err) {
        console.error('[VELO-BE] findContactByEmail error:', err);
        return null;
    }
}

export async function createContact(contactData) {
    try {
        const normalizedPhone = contactData.phone ? await normalizeIsraeliPhone(contactData.phone) : "";
        const result = await contacts.createContact({
            name: { first: contactData.firstName, last: contactData.lastName },
            emails: contactData.email ? [{ email: contactData.email }] : [],
            phones: contactData.phone ? [{ phone: normalizedPhone || contactData.phone }] : [],
        });
        return result;
    } catch (err) {
        console.error('[VELO-BE] createContact error:', err);
        throw err;
    }
}
