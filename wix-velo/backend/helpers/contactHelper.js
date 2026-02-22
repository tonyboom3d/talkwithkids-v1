import { contacts } from 'wix-crm-backend';

export async function searchContactsByQuery(query) {
  if (!query || query.trim().length < 2) return [];

  try {
    const results = await contacts.queryContacts()
      .startsWith('info.name.first', query)
      .or(contacts.queryContacts().startsWith('info.name.last', query))
      .or(contacts.queryContacts().eq('info.phones.phone', query))
      .find();

    return results.items.map(c => ({
      id: c._id,
      firstName: c.info?.name?.first || '',
      lastName: c.info?.name?.last || '',
      email: c.info?.emails?.[0]?.email || '',
      phone: c.info?.phones?.[0]?.phone || '',
    }));
  } catch (err) {
    console.error('[VELO-BE] Contact search error:', err);
    return [];
  }
}

export async function findContactByPhone(phone) {
  try {
    const results = await contacts.queryContacts()
      .eq('info.phones.phone', phone)
      .find();
    return results.items.length > 0 ? results.items[0] : null;
  } catch (err) {
    console.error('[VELO-BE] findContactByPhone error:', err);
    return null;
  }
}

export async function createContact(contactData) {
  try {
    const result = await contacts.createContact({
      name: { first: contactData.firstName, last: contactData.lastName },
      emails: contactData.email ? [{ email: contactData.email }] : [],
      phones: contactData.phone ? [{ phone: contactData.phone }] : [],
    });
    return result;
  } catch (err) {
    console.error('[VELO-BE] createContact error:', err);
    throw err;
  }
}
