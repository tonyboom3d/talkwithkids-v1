import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';

const CARDCOM_BASE_URL = 'https://secure.cardcom.solutions/api/v11';
const LOG_PREFIX = '[CARDCOM-API]';

async function getCardcomCredentials() {
    const [terminalNumber, apiName, apiPassword] = await Promise.all([
        getSecret('CARDCOM_TERMINAL'),
        getSecret('CARDCOM_API_NAME'),
        getSecret('CARDCOM_API_PASSWORD'),
    ]);
    if (!terminalNumber || !apiName || !apiPassword) {
        throw new Error('חסרים פרטי חיבור לקארדקום — יש להגדיר את הסודות ב-Secrets Manager');
    }
    return {
        TerminalNumber: Number(terminalNumber),
        ApiName: String(apiName).trim(),
        ApiPassword: String(apiPassword).trim(),
    };
}

async function cardcomFetch(path, body = {}) {
    const credentials = await getCardcomCredentials();
    const payload = { ...credentials, ...body };

    console.log(`${LOG_PREFIX} POST ${path}`);

    const response = await fetch(`${CARDCOM_BASE_URL}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    } catch (err) {
        console.error(`${LOG_PREFIX} ${path} non-JSON response:`, text.slice(0, 500));
        throw new Error(`תגובה לא תקינה מקארדקום (${response.status})`);
    }

    if (result.ResponseCode != null && result.ResponseCode !== 0) {
        const errorMsg = result.Description || result.ResponseMessage || `Cardcom error code ${result.ResponseCode}`;
        console.error(`${LOG_PREFIX} ${path} failed: code=${result.ResponseCode} msg=${errorMsg}`);
        throw new Error(errorMsg);
    }

    console.log(`${LOG_PREFIX} ${path} OK`);
    return result;
}

/**
 * Creates an invoice/receipt document associated to a Cardcom deal (transaction).
 *
 * @param {object} params
 * @param {string|number} params.dealId - Cardcom InternalDealNumber
 * @param {number} params.documentType - 1=חשבונית מס, 2=חשבונית מס קבלה, 3=קבלה, 101=חשבון עסקה
 * @param {boolean} [params.isSendByEmail=false]
 * @param {boolean} [params.isSendSMS=false]
 * @param {string} [params.customerName]
 * @param {string} [params.customerEmail]
 * @param {string} [params.customerPhone]
 * @param {Array} [params.invoiceItems] - override line items; if omitted, Cardcom uses the deal items
 * @returns {{ docType: number, docId: number, docNumber: string, url: string }}
 */
export async function createDocumentForDeal({
    dealId,
    documentType = 2,
    isSendByEmail = false,
    isSendSMS = false,
    customerName = '',
    customerEmail = '',
    customerPhone = '',
    invoiceItems = null,
}) {
    if (!dealId) throw new Error('חסר מזהה עסקה (dealId) ליצירת מסמך');

    const body = {
        InternalDealNumber: Number(dealId),
        DocumentType: documentType,
        IsSendByEmail: isSendByEmail,
        IsSendSMS: isSendSMS,
    };

    if (customerName) body.CustomerName = customerName;
    if (customerEmail) body.CustomerEmail = customerEmail;
    if (customerPhone) body.CustomerPhone = customerPhone;

    if (Array.isArray(invoiceItems) && invoiceItems.length > 0) {
        body.Items = invoiceItems.map((item, idx) => ({
            Description: item.description || item.name || `פריט ${idx + 1}`,
            Price: Number(item.price) || 0,
            Quantity: Number(item.quantity) || 1,
            IsTaxFree: item.isTaxFree || false,
        }));
    }

    const result = await cardcomFetch('Documents/CreateDocument', body);

    return {
        docType: documentType,
        docId: Number(result.DocumentNumber || result.InvoiceNumber || 0),
        docNumber: String(result.DocumentNumber || result.InvoiceNumber || ''),
        url: String(result.DocumentUrl || result.Url || ''),
    };
}

/**
 * List Cardcom transactions (deals) within a date range.
 *
 * @param {object} filters
 * @param {string} filters.fromDate - ISO date YYYY-MM-DD
 * @param {string} filters.toDate - ISO date YYYY-MM-DD
 * @param {number} [filters.page=1]
 * @param {number} [filters.recordsPerPage=50]
 * @returns {{ transactions: Array, totalRecords: number }}
 */
export async function listTransactions({
    fromDate,
    toDate,
    page = 1,
    recordsPerPage = 50,
} = {}) {
    if (!fromDate || !toDate) throw new Error('חסרים תאריכי סינון לרשימת העסקאות');

    const result = await cardcomFetch('Transactions/GetTransactions', {
        FromDate: fromDate,
        ToDate: toDate,
        Page: page,
        RecordsPerPage: Math.min(recordsPerPage, 100),
    });

    const rawItems = result.Transactions || result.Items || [];
    const transactions = rawItems.map((tx) => ({
        dealId: tx.InternalDealNumber || tx.DealId || 0,
        dealNumber: String(tx.DealNumber || tx.InternalDealNumber || ''),
        amount: Number(tx.Amount || tx.Sum || 0),
        currency: tx.Currency || 'ILS',
        date: tx.Date || tx.CreateDate || '',
        cardLastDigits: tx.CardLastDigits || tx.Last4 || '',
        cardType: tx.CardType || '',
        status: tx.Status || tx.DealStatus || '',
        returnValue: tx.ReturnValue || '',
        customerName: tx.CustomerName || '',
        customerEmail: tx.CustomerEmail || '',
        customerPhone: tx.CustomerPhone || '',
        numOfPayments: tx.NumOfPayments || tx.NumberOfPayments || 1,
    }));

    return {
        transactions,
        totalRecords: Number(result.TotalRecords || result.Total || transactions.length),
    };
}

/**
 * Query existing documents for a specific deal to detect duplicates.
 *
 * @param {number|string} dealId - Cardcom InternalDealNumber
 * @returns {{ documents: Array, hasActiveDocument: boolean }}
 */
export async function findDocumentsForDeal(dealId) {
    if (!dealId) return { documents: [], hasActiveDocument: false };

    const result = await cardcomFetch('Documents/GetDocumentsByDeal', {
        InternalDealNumber: Number(dealId),
    });

    const rawDocs = result.Documents || result.Items || [];
    const documents = rawDocs.map((doc) => ({
        docId: doc.DocumentNumber || doc.InvoiceNumber || 0,
        docNumber: String(doc.DocumentNumber || doc.InvoiceNumber || ''),
        docType: doc.DocumentType || 0,
        url: doc.DocumentUrl || doc.Url || '',
        date: doc.CreateDate || doc.Date || '',
        status: doc.Status || '',
        amount: Number(doc.Amount || doc.Sum || 0),
    }));

    const hasActiveDocument = documents.some(
        (doc) => doc.docId && (!doc.status || doc.status === 'Active' || doc.status === 'active')
    );

    return { documents, hasActiveDocument };
}

/**
 * Resend an existing document via Email or SMS.
 *
 * @param {number|string} documentNumber
 * @param {object} options
 * @param {string} options.method - "email" | "sms"
 * @param {string} [options.email]
 * @param {string} [options.phone]
 */
export async function resendDocument(documentNumber, { method, email = '', phone = '' } = {}) {
    if (!documentNumber) throw new Error('חסר מספר מסמך לשליחה חוזרת');

    const body = {
        DocumentNumber: Number(documentNumber),
        IsSendByEmail: method === 'email',
        IsSendSMS: method === 'sms',
    };

    if (method === 'email' && email) body.Email = email;
    if (method === 'sms' && phone) body.Phone = phone;

    await cardcomFetch('Documents/SendDocument', body);
}
