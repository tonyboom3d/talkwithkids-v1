import { fetch } from 'wix-fetch';
import wixData from 'wix-data';
import wixStoresBackend from 'wix-stores-backend';
import { notifyOwner } from 'backend/tapuzUtils';
import { normalizeIsraeliPhone } from 'backend/helpers/phoneUtils';
import { updateDashboardOrderDeliveryNumber } from 'backend/orderService.jsw';

// כתובת מוצא: מחסן / עסק (משלוח תפוז רגיל)
const SENDER_INFO_TAPUZ = {
    city: "פתח תקווה",
    street: "החרש",
    houseNum: "6",
    companyName: "חן קלימיאן- לדבר עם ילדים TPL",
    zipCode: "4951822"
};

// כתובת מוצא: בית בעלת האתר (משלוח ידני)
const SENDER_INFO_MANUAL = {
    city: "ראשון לציון",
    street: "טביב",
    houseNum: "5",
    companyName: "לדבר עם ילדים",
    zipCode: "7532005"
};
    
// שמירה על שם ישן לתאימות פנימית
const SENDER_INFO = SENDER_INFO_TAPUZ;

export async function processTapuzDelivery(order, lineItem, quantity, config, itemsSummary = "") {
    let tapuzString = "";
    try {
        const customerCode = config.apiMode === "TAPUZ_TEST" ? "27243" : "29233";

        tapuzString = await buildTapuzString(order, quantity, customerCode, SENDER_INFO_TAPUZ, itemsSummary);
        console.log(`[TAPUZ-API] Built pParam string for order #${order.number}: ${tapuzString}`);

        if (config.apiMode === "LOG_ONLY") {
            console.log(`[TAPUZ-API] Mode is LOG_ONLY — skipping HTTP request.`);
            await logSystem(order.number, "INFO", "LOG_ONLY MODE - מחרוזת נוצרה בהצלחה", tapuzString);
            return;
        }

        console.log(`[TAPUZ-API] Sending SOAP request to Tapuz (mode: ${config.apiMode})...`);

        // שידור הבקשה ב-SOAP
        const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Body>
                <SaveData1 xmlns="http://tempuri.org/">
                    <pParam>${tapuzString}</pParam>
                </SaveData1>
            </soap:Body>
        </soap:Envelope>`;

        const response = await fetch("http://crm.tapuzdelivery.co.il/baldarwebservice/Service.asmx", {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': '"http://tempuri.org/SaveData1"'
            },
            body: soapRequest
        });

        const responseText = await response.text();
        console.log(`[TAPUZ-API] Response received (HTTP ${response.status}): ${responseText.substring(0, 300)}`);

        const deliveryMatch = responseText.match(/<DeliveryNumber>(\d+)<\/DeliveryNumber>/);
        const deliveryStringMatch = responseText.match(/<DeliveryNumberString>(.*?)<\/DeliveryNumberString>/);
        const hasError = responseText.includes("-999") || responseText.includes("-100") || /\-2\d{2}/.test(responseText);
        const deliveryNumber = deliveryMatch ? deliveryMatch[1] : "";
        const isValidDeliveryNumber = deliveryNumber && deliveryNumber !== "0";

        if (isValidDeliveryNumber && !hasError) {
            const deliveryNumberString = deliveryStringMatch ? deliveryStringMatch[1] : deliveryNumber;
            console.log(`[TAPUZ-API] SUCCESS — DeliveryNumber: ${deliveryNumber} | DeliveryNumberString: ${deliveryNumberString}`);

            await wixStoresBackend.createFulfillment(order._id, {
                lineItems: [{ index: lineItem.index || 1, quantity: quantity }],
                trackingInfo: {
                    shippingProvider: "Tapuz Delivery",
                    trackingNumber: deliveryNumber,
                    trackingLink: `https://crm.tapuzdelivery.co.il/baldar/deliverystatus.aspx?d=${deliveryNumber}`
                }
            });

            await logSystem(order.number, "SUCCESS", `המשלוח נקלט בתפוז: ${deliveryNumber} | DeliveryNumberString: ${deliveryNumberString}`, tapuzString, responseText);
            try {
                await updateDashboardOrderDeliveryNumber(order.checkoutId, deliveryNumber);
            } catch (dashboardUpdateError) {
                console.warn(`[TAPUZ-API] Could not save delivery number on dashboard order: ${dashboardUpdateError.message}`);
            }
        } else {
            console.log(`[TAPUZ-API] FAILED — no valid DeliveryNumber or error code detected.`);
            throw new Error(`שגיאה מתפוז: ${responseText}`);
        }

    } catch (error) {
        const isTestMode = config?.apiMode === "TAPUZ_TEST";
        console.error(`[TAPUZ-API] ERROR for order #${order.number}: ${error.message}`);
        await logSystem(order.number, "ERROR", `כשל בשידור לתפוז: ${error.message}`, tapuzString);

        await notifyOwner(
            `שגיאה בשידור הזמנה #${order.number} לתפוז`,
            `פרטי השגיאה:\n${error.message}`,
            isTestMode
        );
    }
}

// reason = הסיבה לניתוב לידני (לתיעוד בלוג)
export async function processManualDelivery(order, lineItem, quantity, config, reason = "", itemsSummary = "") {
    let tapuzString = "";
    try {
        const customerCode = config.apiMode === "TAPUZ_TEST" ? "27243" : "29235";
        console.log(`[TAPUZ-API] processManualDelivery | order #${order.number} | customerCode=${customerCode} | reason: ${reason}`);

        tapuzString = await buildTapuzString(order, quantity, customerCode, SENDER_INFO_MANUAL, itemsSummary);
        console.log(`[TAPUZ-API] Built MANUAL pParam string for order #${order.number}: ${tapuzString}`);

        if (config.apiMode === "LOG_ONLY") {
            console.log(`[TAPUZ-API] Mode is LOG_ONLY — skipping HTTP request (manual delivery).`);
            await logSystem(order.number, "INFO", `LOG_ONLY MODE (manual) | סיבה: ${reason}`, tapuzString);
            return;
        }

        console.log(`[TAPUZ-API] Sending MANUAL SOAP request to Tapuz (mode: ${config.apiMode})...`);

        const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Body>
                <SaveData1 xmlns="http://tempuri.org/">
                    <pParam>${tapuzString}</pParam>
                </SaveData1>
            </soap:Body>
        </soap:Envelope>`;

        const response = await fetch("http://crm.tapuzdelivery.co.il/baldarwebservice/Service.asmx", {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': '"http://tempuri.org/SaveData1"'
            },
            body: soapRequest
        });

        const responseText = await response.text();
        console.log(`[TAPUZ-API] Manual response (HTTP ${response.status}): ${responseText.substring(0, 300)}`);

        const deliveryMatch = responseText.match(/<DeliveryNumber>(\d+)<\/DeliveryNumber>/);
        const deliveryStringMatch = responseText.match(/<DeliveryNumberString>(.*?)<\/DeliveryNumberString>/);
        const hasError = responseText.includes("-999") || responseText.includes("-100") || /\-2\d{2}/.test(responseText);
        const deliveryNumber = deliveryMatch ? deliveryMatch[1] : "";
        const isValidDeliveryNumber = deliveryNumber && deliveryNumber !== "0";

        if (isValidDeliveryNumber && !hasError) {
            const deliveryNumberString = deliveryStringMatch ? deliveryStringMatch[1] : deliveryNumber;
            console.log(`[TAPUZ-API] SELF DELIVERY SUCCESS — DeliveryNumber: ${deliveryNumber} | DeliveryNumberString: ${deliveryNumberString}`);

            await wixStoresBackend.createFulfillment(order._id, {
                lineItems: [{ index: lineItem.index || 1, quantity: quantity }],
                trackingInfo: {
                    shippingProvider: "Tapuz Delivery (Manual)",
                    trackingNumber: deliveryNumber,
                    trackingLink: `https://crm.tapuzdelivery.co.il/baldar/deliverystatus.aspx?d=${deliveryNumber}`
                }
            });

            await logSystem(
                order.number,
                "SUCCESS",
                `משלוח מהבית נקלט בתפוז: ${deliveryNumber} | DeliveryNumberString: ${deliveryNumberString} | סיבה: ${reason}`,
                tapuzString,
                responseText
            );
            try {
                await updateDashboardOrderDeliveryNumber(order.checkoutId, deliveryNumber);
            } catch (dashboardUpdateError) {
                console.warn(`[TAPUZ-API] Could not save manual delivery number on dashboard order: ${dashboardUpdateError.message}`);
            }
        } else {
            console.log(`[TAPUZ-API] SELF DELIVERY FAILED — no valid DeliveryNumber or error code detected.`);
            throw new Error(`שגיאה מתפוז (משלוח מהבית): ${responseText}`);
        }

    } catch (error) {
        const isTestMode = config?.apiMode === "TAPUZ_TEST";
        console.error(`[TAPUZ-API] ERROR in manual delivery for order #${order.number}: ${error.message}`);
        await logSystem(order.number, "ERROR", `כשל בשידור משלוח מהבית לתפוז | סיבה: ${reason} | שגיאה: ${error.message}`, tapuzString);

        await notifyOwner(
            `שגיאה בשידור משלוח מהבית - הזמנה #${order.number}`,
            `סיבת ניתוב: ${reason}\n\nפרטי השגיאה:\n${error.message}`,
            isTestMode
        );
    }
}

function cleanStr(str) {
    if (!str) return "";
    return String(str).replace(/[;'",&*]/g, '').trim();
}

/**
 * שולף מתוך טקסט חופשי (addressLine2) ערך של קומה / דירה / כניסה.
 * תומך בוריאציות: "קומה 2", "קומה: 2", "קומה - 2", "קומה:2" וכו׳
 * מחזיר מחרוזת של המספר שנמצא, או "" אם לא נמצא.
 */
function extractAddressField(text, keywords) {
    if (!text) return "";
    for (const kw of keywords) {
        const re = new RegExp(kw + "\\s*[-:]?\\s*(\\d+)", "i");
        const m = text.match(re);
        if (m) return m[1];
    }
    return "";
}

async function buildTapuzString(order, quantity, customerCode, sender, itemsSummary = "") {
    // נתיבי הכתובת האמיתיים לפי מבנה Wix ecom API
    const shipping = order.shippingInfo?.logistics?.shippingDestination || {};
    const billing  = order.billingInfo || {};

    const sAddr    = shipping.address    || billing.address    || {};
    const contact  = shipping.contactDetails || billing.contactDetails || {};

    const streetName   = sAddr.streetAddress?.name || "";
    const streetNum    = sAddr.streetAddress?.number || "";
    const apt          = sAddr.streetAddress?.apt || "";
    const addressLine2 = sAddr.addressLine2 || "";
    const city       = sAddr.city || "";
    const zipCode    = sAddr.postalCode || sAddr.zipCode || "";

    const firstName = contact.firstName || "";
    const lastName  = contact.lastName  || "";
    const fullName  = `${firstName} ${lastName}`.trim();

    const phone = await normalizeIsraeliPhone(contact.phone || "");
    const email = order.buyerInfo?.email || contact.email || "";

    // שליפת קומה / דירה / כניסה מ-addressLine2 לשדות הייעודיים בתפוז (35-37)
    const destFloor    = extractAddressField(addressLine2, ["קומה"]);
    const destApt      = extractAddressField(addressLine2, ["דירה", "דירה מס", "דירה מס'"]);
    const destEntrance = extractAddressField(addressLine2, ["כניסה"]);

    // שם הילד/ה מ-extendedFields._user_fields.child_name (עם fallback ל-customFields להזמנות ישנות)
    const childName =
        order.extendedFields?.namespaces?._user_fields?.child_name
        || order.customFields?.find(f =>
            f.title === "child_name" || f.translatedTitle === "child_name"
        )?.value
        || "";

    // הערות למשלוח: שם ילד + רשימת מוצרים + buyerNote + customFields["הערות"] + addressLine2 המלא, מופרדים ב-|||
    const noteParts = [];
    if (childName) {
        noteParts.push(`שם הילד/ה: ${childName}`);
    }
    if (itemsSummary) {
        noteParts.push(itemsSummary);
    }
    if (order.buyerNote) {
        noteParts.push(order.buyerNote);
    }
    const customNote = order.customFields?.find(f =>
        f.title === "הערות" || f.translatedTitle === "הערות"
    )?.value;
    if (customNote) {
        noteParts.push(customNote);
    }

    // כל מה שהמשתמש כתב ב-addressLine2 נכנס כמו שהוא לטובת השליח
    if (addressLine2) {
        noteParts.push(`פרטי כתובת נוספים: ${addressLine2}`);
    }

    const deliveryNote = noteParts.length ? noteParts.join(" ||| ") : "אין הערות";

    // שדה 6: מס׳ בית + דירה מ-streetAddress.apt (אם יש) — ברמת הכתובת הבסיסית
    const houseAndApt = apt ? `${streetNum} דירה ${apt}` : streetNum;

    // חישוב מספר חבילות לפי כמות כוללת בהזמנה:
    // עד 15 פריטים = חבילה 1, 16-30 = 2 חבילות וכו'
    const totalQuantity = Array.isArray(order.lineItems)
        ? order.lineItems.reduce((sum, li) => sum + (li.quantity || 0), 0)
        : (quantity || 0);
    const baseQuantity = totalQuantity > 0 ? totalQuantity : quantity;
    const packagesCount = Math.max(1, Math.ceil(baseQuantity / 15));

    // סעיף 15: תמיד מוגדר כמשלוח רגיל (1), גם אם יש יותר מחבילה אחת
    const isDoubleDelivery = "1";

    // מערך פרמטרים לפי הסדר המדויק במסמך
    const params = [
        "1", // 1. סוג משלוח (1=שליחות)
        cleanStr(sender.street), // 2. רחוב מוצא
        cleanStr(sender.houseNum), // 3. מס בית מוצא
        cleanStr(sender.city), // 4. עיר מוצא
        cleanStr(streetName), // 5. רחוב יעד
        cleanStr(houseAndApt), // 6. מספר בית + דירה יעד (מ-streetAddress)
        cleanStr(city), // 7. עיר יעד
        cleanStr(sender.companyName), // 8. שם חברה במוצא
        cleanStr(fullName), // 9. שם נמען ביעד
        cleanStr(deliveryNote), // 10. הוראות למשלוח
        "1", // 11. דחיפות (1=רגיל)
        "0", // 12. קבוע 0
        "1", // 13. סוג דיוור (1=סטנדרט)
        String(packagesCount), // 14. מספר חבילות (מחושב דינאמית)
        isDoubleDelivery, // 15. משלוח רגיל או כפול
        "0", // 16. קבוע 0
        cleanStr(String(order.number)), // 17. מספר תעודה / הזמנה
        customerCode, // 18. קוד לקוח תפוז
        cleanStr(String(order.number)), // 19. ברקוד
        cleanStr(email), // 20. אימייל נמען
        "0", // 21. חבילות חריגות
        cleanStr(sender.zipCode), // 22. מיקוד מוצא
        cleanStr(zipCode), // 23. מיקוד יעד
        cleanStr(fullName), // 24. איש קשר נוסף ביעד
        phone, // 25. טלפון נייד (פורמט אחיד 05XXXXXXXX)
        "0", // 26. קבוע 0
        new Date().toISOString().split('T')[0], // 27. תאריך שידור YYYY-MM-DD
        "", // 28. גוביינא (ריק)
        "", // 29. שם משתמש
        "", // 30. סיסמא
        "", // 31. טלפון באיסוף
        "", // 32. כניסה מוצא
        "", // 33. קומה מוצא
        "", // 34. דירה מוצא
        cleanStr(destEntrance), // 35. כניסה יעד (מ-addressLine2)
        cleanStr(destFloor),    // 36. קומה יעד (מ-addressLine2)
        cleanStr(destApt),      // 37. דירה יעד (מ-addressLine2)
    ];

    return params.join(';');
}

async function logSystem(orderNumber, status, message, stringSent = "", response = "") {
    await wixData.insert("SystemLogs", {
        orderNumber,
        status,
        message,
        tapuzString: stringSent,
        response: response
    }, { suppressAuth: true });
}
