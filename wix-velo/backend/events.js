import wixData from 'wix-data';
import { fetch } from 'wix-fetch';
import { authentication } from 'wix-members-backend';
import { orders as pricingOrders } from '@wix/pricing-plans';
import { auth } from '@wix/essentials';
import { contacts } from 'wix-crm.v2';
import { elevate } from 'wix-auth';
import { getProductById, notifyOwner } from 'backend/tapuzUtils';
import { processTapuzDelivery, processManualDelivery } from 'backend/tapuzApi';
import { normalizeIsraeliPhone } from 'backend/helpers/phoneUtils';
import { findContactByEmail } from 'backend/helpers/contactHelper';

// =========================================================
// פונקציות עזר למנויים
// =========================================================

// מחזיר { memberId, isNew }
// אם buyerInfo.memberId קיים — המשתמש כבר רשום, מחזירים ישירות.
// אחרת — מנסים לרשום; אם האימייל כבר קיים (Fallback) — שולפים לפי אימייל.
async function getOrCreateMember(email, password, firstName, lastName, existingMemberId, phone) {
    if (existingMemberId) {
        console.log(`🟠 [SUBSCRIPTION] Member identified via buyerInfo.memberId: ${existingMemberId}`);
        return { memberId: existingMemberId, isNew: false };
    }

    try {
        console.log(
            `🟠 [SUBSCRIPTION] Calling authentication.register | email=${email} | firstName=${firstName} | lastName=${lastName} | passwordLength=${password ? String(password).length : 0}`
        );
        const contactInfo = { firstName, lastName };
        if (phone) contactInfo.phones = [phone];
        const registrationResult = await authentication.register(email, password, { contactInfo });
        const memberId = registrationResult?.member?._id;
        if (!memberId) {
            throw new Error(`Member registered but memberId is missing for email: ${email}`);
        }
        return { memberId, isNew: true };
    } catch (err) {
        console.error(
            `🟠 [SUBSCRIPTION] authentication.register error | email=${email} | message=${err.message}`,
            err && typeof err === 'object' ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : err
        );

        const msg = err.message ? err.message.toLowerCase() : '';
        const isDuplicate = msg.includes('already exists') || msg.includes('duplicate');

        if (isDuplicate) {
            console.log(`🟠 [SUBSCRIPTION] Registration failed (duplicate) — fetching existing member by email: ${email}`);
            const existing = await wixData.query("Members/FullData")
                .eq("loginEmail", email)
                .find({ suppressAuth: true });

            console.log(`🟠 [SUBSCRIPTION] Members/FullData lookup result for ${email}: count=${existing.items.length}`);

            if (existing.items.length > 0) {
                return { memberId: existing.items[0]._id, isNew: false };
            }
            throw new Error(`Member duplicate detected but could not find existing member for email: ${email}`);
        }
        throw err;
    }
}

// שולף את רשומת SystemLogs לפי orderNumber (עד 3 ניסיונות עם המתנה 5 שניות)
// מחזיר את הרשומה, או null אם לא נמצא
async function fetchLogRecord(orderNumber) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await wixData.query("SystemLogs")
            .eq("orderNumber", String(orderNumber))
            .find({ suppressAuth: true });

        if (result.items.length > 0) return result.items[0];

        if (attempt < 3) {
            console.log(`[SUBSCRIPTION] SystemLogs record not found for order #${orderNumber} (attempt ${attempt}/3) — waiting 5s...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    return null;
}

// מוסיף שורת לוג לשדה subscriptionLog ברשומת SystemLogs של ההזמנה
async function appendSubscriptionLog(orderNumber, logLine) {
    const record = await fetchLogRecord(orderNumber);

    if (!record) {
        console.error(`[SUBSCRIPTION] Could not find SystemLogs record for order #${orderNumber} after 3 attempts.`);
        await wixData.insert("SystemLogs", {
            orderNumber: String(orderNumber),
            status: "ERROR",
            message: `לא נמצאה רשומה ב-SystemLogs לאחר 3 ניסיונות`,
            subscriptionLog: logLine
        }, { suppressAuth: true });
        return;
    }

    const existing = record.subscriptionLog ? `${record.subscriptionLog}\n${logLine}` : logLine;
    await wixData.update("SystemLogs", { ...record, subscriptionLog: existing }, { suppressAuth: true });
}

// =========================================================
// עזר לפורמט תגיות מסוג delivery
// =========================================================

function normalizeTags(tagsValue) {
    if (!tagsValue) return [];
    if (Array.isArray(tagsValue)) {
        return tagsValue
            .map((t) => {
                if (typeof t === "string") return t;
                if (t && typeof t === "object") {
                    return t.label || t.title || t.name || t.value || "";
                }
                return "";
            })
            .filter(Boolean)
            .map(String);
    }
    if (typeof tagsValue === "string") return [tagsValue];
    if (tagsValue && typeof tagsValue === "object") {
        const maybe = tagsValue.label || tagsValue.title || tagsValue.name || tagsValue.value;
        return maybe ? [String(maybe)] : [];
    }
    return [];
}

function hasDeliveryTag(rule, tag) {
    return normalizeTags(rule?.deliveryType).includes(tag);
}

// מחזיר true אם ל-rule יש לפחות תגית deliveryType אחת (כלומר — המוצר ניתן למשלוח)
function hasAnyDeliveryType(rule) {
    return normalizeTags(rule?.deliveryType).length > 0;
}

// =========================================================
// מיזוג contact ישן (קיים לפני יצירת ה-member) עם ה-contact החדש
// שנוצר אוטומטית בעת הרשמת ה-member.
// רץ כתהליך המשך שאינו חוסם את שאר הזרימה.
// =========================================================

async function mergeContactsIfNeeded(email, memberId) {
    if (!email || !memberId) return;

    try {
        const oldContact = await findContactByEmail(email);
        if (!oldContact) {
            console.log(`🟣 [MERGE] No pre-existing contact found for email: ${email} — skipping merge.`);
            return;
        }

        // שלוף את ה-contact המשויך ל-member החדש
        const elevatedGetContact = elevate(contacts.getContact);
        let newContact;
        try {
            newContact = await elevatedGetContact(memberId);
        } catch (err) {
            console.warn(`🟣 [MERGE] Could not fetch new contact for memberId ${memberId}: ${err.message} — skipping merge.`);
            return;
        }

        if (!newContact?._id) {
            console.warn(`🟣 [MERGE] New contact has no _id for memberId ${memberId} — skipping merge.`);
            return;
        }

        if (oldContact._id === newContact._id) {
            console.log(`🟣 [MERGE] Old and new contact are the same (${oldContact._id}) — no merge needed.`);
            return;
        }

        console.log(`🟣 [MERGE] Merging old contact ${oldContact._id} into new contact ${newContact._id} for email: ${email}`);

        const elevatedMergeContacts = elevate(contacts.mergeContacts);
        await elevatedMergeContacts(
            newContact._id,
            newContact.revision,
            { sourceContactIds: [oldContact._id] }
        );

        console.log(`🟣 [MERGE] ✅ Contacts merged successfully | target: ${newContact._id} | source: ${oldContact._id}`);
    } catch (err) {
        console.error(`🟣 [MERGE] ❌ mergeContactsIfNeeded failed for email ${email}: ${err.message}`);
    }
}

export async function wixEcom_onOrderApproved(event) {
    const order = event.data.order;
    console.log(`[TAPUZ] Order approved: #${order.number} | items: ${order.lineItems.length} | shipping: "${order.shippingInfo?.title || 'N/A'}" | status: ${order.paymentStatus}`);

    let config = null;
    let isTestMode = false;

    try {
        console.log(`[TAPUZ] Order data: ${JSON.stringify(order)}`);
        config = await wixData.get("AppConfig", "SINGLE_ITEM_ID", { suppressAuth: true });
        console.log(`[TAPUZ] Config: automationMode=${config?.automationMode} | apiMode=${config?.apiMode}`);

        isTestMode = (config?.apiMode === "TAPUZ_TEST");
        const shippingTitle = order.shippingInfo?.title || "";
        const isPickup = shippingTitle.includes("איסוף") || shippingTitle.includes("Pickup");

        // איסוף עצמי — לא משודר לתפוז כלל, רק לוג ב-SystemLogs
        if (isPickup) {
            console.log("[TAPUZ] Pickup order detected — will NOT be sent to Tapuz.");
            await wixData.insert("SystemLogs", {
                orderNumber: String(order.number),
                status: "INFO",
                message: "הזמנה באיסוף עצמי - לא נשלחה לתפוז",
                tapuzString: "",
                response: ""
            }, { suppressAuth: true });
            return;
        }

        // בדיקת DeliveryRules לכל פריט — מוצר ללא רשומה או עם deliveryType ריק = לא נשלח
        const shippableItems = [];
        const ruleByProductId = new Map();

        for (const item of order.lineItems) {
            const productId = item.catalogReference?.catalogItemId || item.rootCatalogItemId;
            if (!productId) {
                console.log("[TAPUZ] Item has no productId — skipping.");
                continue;
            }

            const ruleQuery = await wixData.query("DeliveryRules").eq("product", productId).find({ suppressAuth: true });
            const rule = ruleQuery.items.length > 0 ? ruleQuery.items[0] : null;

            if (!rule) {
                console.log(`[TAPUZ] No DeliveryRule for product ${productId} — skipping (no shipping).`);
                continue;
            }

            if (!hasAnyDeliveryType(rule)) {
                console.log(`[TAPUZ] Product ${productId} has DeliveryRule but empty deliveryType — skipping (no shipping).`);
                continue;
            }

            console.log(`[TAPUZ] Product ${productId} is shippable | deliveryType=${rule.deliveryType}`);
            shippableItems.push(item);
            ruleByProductId.set(productId, rule);
        }

        if (shippableItems.length === 0) {
            console.log("[TAPUZ] No shippable items — skipping Tapuz.");
            await wixData.insert("SystemLogs", {
                orderNumber: String(order.number),
                status: "NO DELIVERY",
                message: "NO DELIVERY | D.P. — כל המוצרים בהזמנה הם דיגיטליים ללא משלוח",
                tapuzString: "",
                response: ""
            }, { suppressAuth: true });
        } else {
            // מצב ידני גורף — כל ההזמנות עם פריט משלוח עוברות לתפוז ידני
            if (config?.automationMode === "MANUAL") {
                console.log("[TAPUZ] System is in MANUAL mode — sending to manual Tapuz.");
                const item = shippableItems[0];
                const itemsSummary = shippableItems
                    .map(it => {
                        const name = it.productName?.original || it.productName?.translated || (typeof it.productName === 'string' ? it.productName : null) || "מוצר";
                        return `${name} (כ: ${it.quantity})`;
                    })
                    .join(" | ");
                await processManualDelivery(order, item, item.quantity, config, "המערכת במצב MANUAL", itemsSummary);
            } else {
                let sendToManual = false;
                let manualReason = "";
                let tapuzRule = null;

                // בדיקת הערות ב-customFields — אם יש ערך, מנתב ל"משלוח מהבית"
                const customNote = order.customFields?.find(f =>
                    f.title === "הערות" || f.translatedTitle === "הערות"
                )?.value;
                if (customNote) {
                    console.log(`[TAPUZ] Custom note detected: "${customNote}" — routing to manual (משלוח מהבית).`);
                    sendToManual = true;
                    manualReason = `הערת לקוח: ${customNote}`;
                }

                for (const item of shippableItems) {
                    const productId = item.catalogReference?.catalogItemId || item.rootCatalogItemId;
                    const rule = ruleByProductId.get(productId);

                    if (!tapuzRule) tapuzRule = rule;

                    const productData = await getProductById(productId);
                    const currentStock = productData?.stock?.quantity || 0;
                    console.log(`[TAPUZ] Stock for "${productData?.name}": ${currentStock} | alertThreshold=${rule.inventoryAlertThreshold} | manualThreshold=${rule.manualRoutingThreshold}`);

                    if (rule.inventoryAlertThreshold && currentStock <= rule.inventoryAlertThreshold) {
                        console.log(`[TAPUZ] Low stock alert triggered for "${productData?.name}".`);
                        await notifyOwner("התראת מלאי - משלוחים", `המלאי של המוצר ${productData?.name} ירד ל-${currentStock}.`, isTestMode);
                    }

                    if (typeof rule.manualRoutingThreshold === 'number' && currentStock <= rule.manualRoutingThreshold) {
                        console.log(`[TAPUZ] Stock below manualRoutingThreshold — routing to manual Tapuz.`);
                        sendToManual = true;
                        manualReason = manualReason || `מלאי נמוך (${currentStock}) למוצר ${productData?.name}`;
                    }

                    // תג "בית" רלוונטי רק בהזמנה עם פריט משלוח אחד
                    if (shippableItems.length === 1 && hasDeliveryTag(rule, "בית")) {
                        console.log(`[TAPUZ] Product rule has tag "בית" (single item) — routing to manual Tapuz.`);
                        sendToManual = true;
                        manualReason = manualReason || "מוצר מוגדר למשלוח מהבית";
                    }
                }

                if (shippableItems.length > 1) {
                    console.log(`[TAPUZ] Multiple shippable items (${shippableItems.length}) — routing to manual Tapuz.`);
                    sendToManual = true;
                    manualReason = manualReason || "הזמנה מרובת פריטים";
                }

                const firstItem = shippableItems[0];

                // בניית מחרוזת מוצרים לשדה ההערות בתפוז: "שם מוצר (כ: X) | ..."
                const itemsSummary = shippableItems
                    .map(it => {
                        const name = it.productName?.original || it.productName?.translated || (typeof it.productName === 'string' ? it.productName : null) || "מוצר";
                        return `${name} (כ: ${it.quantity})`;
                    })
                    .join(" | ");

                if (sendToManual) {
                    console.log(`[TAPUZ] Final decision: MANUAL Tapuz delivery | reason: ${manualReason}`);
                    await processManualDelivery(order, firstItem, firstItem.quantity, config, manualReason, itemsSummary);
                } else if (tapuzRule && hasDeliveryTag(tapuzRule, "תפוז")) {
                    console.log(`[TAPUZ] Final decision: TAPUZ delivery — sending order #${order.number}.`);
                    await processTapuzDelivery(order, firstItem, firstItem.quantity, config, itemsSummary);
                } else {
                    console.log(`[TAPUZ] Final decision: No matching delivery tag. tapuzRule=${JSON.stringify(tapuzRule)}`);
                }
            }
        }

        // מנויים: בדיקת/יצירת משתמש + שיוך תוכניות (לוגיקה נפרדת, אותו order)
        try {
            await processOrderSubscriptions(order);
        } catch (subErr) {
            console.error(`🟠 [SUBSCRIPTION] Error in processOrderSubscriptions: ${subErr.message}`, subErr.stack);
        }

    } catch (error) {
        console.error(`[TAPUZ] FATAL error: ${error.message}`, error.stack);
        await wixData.insert("SystemLogs", {
            status: "FATAL",
            message: `שגיאת מערכת קריטית בהזמנה: ${error.message}`
        }, { suppressAuth: true });

        await notifyOwner(
            `שגיאה קריטית במערכת המשלוחים`,
            `אירעה שגיאה בלתי צפויה בעיבוד הזמנה.\n\nOrder #${event?.data?.order?.number || 'לא ידוע'} (ID: ${event?.data?.order?._id || 'לא ידוע'})\n\nפרטי השגיאה:\n${error.message}`,
            isTestMode
        );
    }
}

// =========================================================
// שליחת פרטי התחברות ללקוח דרך וובהוק (WhatsApp)
// תמיד שולח phone (= סיסמה מנורמלת 05XXXXXXXX).
// isNew=true → שולח email + password + phone | isNew=false → שולח email + phone (ללא password)
// =========================================================

const MEMBER_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/Qt9lEQiyh8wgVPJM4d6Q/webhook-trigger/8cec9f31-508f-4411-bcf9-9ed60bf03e83";

async function sendMemberWebhook(email, password, firstName, lastName, isNew) {
    const payload = isNew
        ? { email, password, phone: password, firstName, lastName }
        : { email, phone: password, firstName, lastName };

    console.log(`🟠 [SUBSCRIPTION] Sending member webhook | isNew=${isNew} | email=${email} | phone=${password} | firstName=${firstName} | lastName=${lastName}`);

    try {
        const response = await fetch(MEMBER_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const responseText = await response.text();
        console.log(`🟠 [SUBSCRIPTION] Webhook response (${response.status}): ${responseText.substring(0, 200)}`);
    } catch (err) {
        console.error(`🟠 [SUBSCRIPTION] ❌ Failed to send member webhook: ${err.message}`);
    }
}

// =========================================================
// פונקציה נפרדת: מנויים — בדיקת/יצירת משתמש + שיוך תוכניות
// מקבלת order, רצה מתוך wixEcom_onOrderApproved
// =========================================================

async function processOrderSubscriptions(order) {
    const orderNumber = String(order.number);
    const email = order.buyerInfo?.email || "";
    const existingMemberId = order.buyerInfo?.memberId || null;
    const rawPhone = order.shippingInfo?.logistics?.shippingDestination?.contactDetails?.phone
        || order.billingInfo?.contactDetails?.phone || "";
    const firstName = order.shippingInfo?.logistics?.shippingDestination?.contactDetails?.firstName
        || order.billingInfo?.contactDetails?.firstName || "";
    const lastName = order.shippingInfo?.logistics?.shippingDestination?.contactDetails?.lastName
        || order.billingInfo?.contactDetails?.lastName || "";

    // phone מנורמל 05XXXXXXXX — משמש כסיסמה לרישום משתמש חדש וכ-phone ל-webhook בכל מקרה
    const password = await normalizeIsraeliPhone(rawPhone);
    if (!password) {
        console.warn(`🟠 [SUBSCRIPTION] ⚠️ Phone normalization failed for order #${orderNumber} | rawPhone="${rawPhone}" — webhook phone field will be empty`);
    }

    console.log(
        `🟠 [SUBSCRIPTION] ── Processing order #${orderNumber} | email=${email} | buyerMemberId=${existingMemberId || 'none (new user)'} | items=${order.lineItems.length}`
    );
    console.log(
        `🟠 [SUBSCRIPTION] Member input snapshot | order=${orderNumber} | rawPhone=${rawPhone} | normalizedPhone=${password} | firstName=${firstName} | lastName=${lastName}`
    );
    console.log(
        `🟠 [SUBSCRIPTION] buyerInfo snapshot: ${JSON.stringify(order.buyerInfo || {})}`
    );

    const elevatedCreateOfflineOrder = auth.elevate(pricingOrders.createOfflineOrder);

    const seenProductIds = new Set();
    const planIds = [];

        for (const item of order.lineItems) {
            const productId = item.catalogReference?.catalogItemId || item.rootCatalogItemId;
            if (!productId) continue;
            if (seenProductIds.has(productId)) {
                console.log(`🟠 [SUBSCRIPTION] Skipping duplicate product: ${productId}`);
                continue;
            }
            seenProductIds.add(productId);
            console.log(`🟠 [SUBSCRIPTION] Checking product: ${productId} for relatedPlan...`);

            const ruleQuery = await wixData.query("DeliveryRules")
                .eq("product", productId)
                .find({ suppressAuth: true });

        if (ruleQuery.items.length === 0) {
            console.log(`🟠 [SUBSCRIPTION] No DeliveryRule found for product: ${productId} — skipping.`);
            continue;
        }

        const rule = ruleQuery.items[0];
        const planId = rule.relatedPlan;
        if (!planId) {
            console.log(`🟠 [SUBSCRIPTION] DeliveryRule found but no relatedPlan for product: ${productId} — skipping.`);
            continue;
        }
        if (planIds.includes(planId)) {
            console.log(`🟠 [SUBSCRIPTION] Plan ${planId} already queued — skipping duplicate.`);
            continue;
        }
        planIds.push(planId);
        console.log(`🟠 [SUBSCRIPTION] ✔ relatedPlan found: ${planId} for product: ${productId}`);
    }

    if (planIds.length === 0) {
        console.log(`🟠 [SUBSCRIPTION] No relatedPlan found for any product in order #${orderNumber} — exiting.`);
        return;
    }

    console.log(`🟠 [SUBSCRIPTION] Plans to assign (${planIds.length}): ${planIds.join(', ')}`);

    let memberId, isNew;
    try {
        console.log(`🟠 [SUBSCRIPTION] Resolving member | email: ${email} | existingMemberId: ${existingMemberId || 'none'}...`);
        const result = await getOrCreateMember(email, password, firstName, lastName, existingMemberId, password);
        memberId = result.memberId;
        isNew = result.isNew;
        console.log(`🟠 [SUBSCRIPTION] Member ${isNew ? '🆕 approved from contact' : '🔁 already exists'} | memberId: ${memberId}`);

        await sendMemberWebhook(email, password, firstName, lastName, isNew);
    } catch (err) {
        console.error(`🟠 [SUBSCRIPTION] ❌ Failed to get/create member for order #${orderNumber}: ${err.message}`);
        await appendSubscriptionLog(orderNumber,
            `${new Date().toISOString()} | email: ${email} | ERROR: failed to get/create member — ${err.message}`
        );
        return;
    }

    for (const planId of planIds) {
        console.log(`🟠 [SUBSCRIPTION] Assigning plan ${planId} to member ${memberId}...`);
        try {
            const newOrder = await elevatedCreateOfflineOrder(planId, memberId);
            const planName = newOrder.planName || planId;
            console.log(`🟠 [SUBSCRIPTION] ✅ Plan assigned: "${planName}" (${planId}) → member ${memberId}`);

            await appendSubscriptionLog(orderNumber,
                `${new Date().toISOString()} | email: ${email} | member: ${isNew ? 'new' : 'existing'} | plan: ${planName} (${planId})`
            );
        } catch (err) {
            console.error(`🟠 [SUBSCRIPTION] ❌ Failed to assign plan ${planId} to member ${memberId}: ${err.message}`);
            await appendSubscriptionLog(orderNumber,
                `${new Date().toISOString()} | email: ${email} | member: ${isNew ? 'new' : 'existing'} | ERROR assigning plan ${planId}: ${err.message}`
            );
        }
    }

    console.log(`🟠 [SUBSCRIPTION] ── Done processing order #${orderNumber}`);

    // מיזוג contact ישן עם ה-contact שנוצר לעם ה-member — תהליך המשך שאינו חוסם
    try {
        await mergeContactsIfNeeded(email, memberId);
    } catch (mergeErr) {
        console.error(`🟣 [MERGE] Unexpected error in mergeContactsIfNeeded: ${mergeErr.message}`);
    }
}
