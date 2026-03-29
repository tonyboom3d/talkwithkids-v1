# מערכת משלוחים: אינטגרציה Wix Stores ↔ תפוז

> מסמך זה מרכז את כלל הלוגיקה, הגדרות ה-CMS וקוד המקור של מערכת הניתוב האוטומטי של הזמנות לחברת שליחויות **תפוז** (Tapuz SOAP API).

---

## תוכן עניינים

1. [לוגיקת ניתוב (Routing Rules)](#1-לוגיקת-ניתוב)
2. [מאגרי מידע (CMS Collections)](#2-מאגרי-מידע)
3. [קבצי הקוד](#3-קבצי-הקוד)
4. [מדריך בדיקות ומעבר לפרודקשן](#4-מדריך-בדיקות-ומעבר-לפרודקשן)

---

## 1. לוגיקת ניתוב

המערכת מאזינה לאירוע `wixStores_onNewOrder`. כאשר נכנסת הזמנה חדשה, המערכת ממתינה **3 שניות** (כדי להבטיח שכל נתוני ה-ecom נשמרו) ואז מריצה את שרשרת הבדיקות הבאה:

### שרשרת הניתוב (לפי סדר עדיפות)

| # | תנאי | תוצאה |
|---|------|--------|
| 1 | `automationMode = MANUAL` ב-AppConfig | → ניתוב ידני גורף |
| 2 | הלקוח בחר **איסוף עצמי** (Pickup) | → ניתוב ידני |
| 3 | הזמנה עם **יותר מפריט אחד** (`lineItems > 1`) | → ניתוב ידני |
| 4 | חוק ניתוב של מוצר = **"ידני"** ב-DeliveryRules | → ניתוב ידני |
| 5 | מלאי נמוך מ-`manualRoutingThreshold` | → ניתוב ידני אוטומטי |
| 6 | אין חוק למוצר **וגם** אין ברירת מחדל | → ניתוב ידני + שגיאה בלוג |
| ✓ | כל הבדיקות עברו, חוק = **"תפוז"** | → שידור אוטומטי לתפוז |

### התראות מלאי

- אם המלאי ירד מתחת ל-`inventoryAlertThreshold` → **מייל אוטומטי לבעלת האתר**.
- אם המלאי ירד מתחת ל-`manualRoutingThreshold` → ניתוב ידני אוטומטי (ללא שידור לתפוז).

### חישוב חבילות

עבור מוצרים שנשלחים בתפוז:
- כל **15 יחידות** = חבילה אחת (1–15 = חבילה 1, 16–30 = 2 חבילות, וכו').
- מעל 15 יחידות — נשלח דגל **משלוח כפול** (שדה 15 בסטרינג = `"2"`).

---

## 2. מאגרי מידע

### 2.1 `DeliveryRules` — חוקי ניתוב

| שדה | סוג | תיאור |
|-----|-----|--------|
| `product` | Reference | קישור למוצר ב-Products |
| `deliveryType` | Text | `"תפוז"` או `"ידני"` |
| `inventoryAlertThreshold` | Number | סף כמות לשליחת התראת מלאי |
| `manualRoutingThreshold` | Number | סף כמות למעבר אוטומטי לידני |
| `isDefault` | Boolean | ✓ לחוק ברירת המחדל |

### 2.2 `ManualFulfillments` — הזמנות לטיפול ידני

| שדה | סוג | תיאור |
|-----|-----|--------|
| `orderNumber` | Text | מספר ההזמנה |
| `orderId` | Text | מזהה פנימי של ההזמנה |
| `reason` | Text | סיבת ניתוב לידני (למשל: "איסוף עצמי") |
| `isHandled` | Boolean | האם טופל על ידי בעלת האתר |
| `shippingAddress` | Text (JSON) | כתובת המשלוח: `{firstName, lastName, phone, email, street, streetNumber, city, zipCode}` |

### 2.3 `SystemLogs` — לוגים

| שדה | סוג | תיאור |
|-----|-----|--------|
| `orderNumber` | Text | מספר ההזמנה |
| `status` | Text | `INFO` / `SUCCESS` / `ERROR` / `FATAL` |
| `message` | Text | תיאור הפעולה או השגיאה |
| `tapuzString` | Long Text | המחרוזת שנשלחה לשרתי תפוז |
| `response` | Long Text | התשובה שהתקבלה מתפוז |

### 2.4 `AppConfig` — הגדרות מערכת (Single Item)

> מאגר מסוג **Single Item** — ה-ID הקבוע של השורה הוא `SINGLE_ITEM_ID`.

| שדה | סוג | ערכים אפשריים |
|-----|-----|----------------|
| `automationMode` | Text | `AUTO` / `MANUAL` |
| `apiMode` | Text | `LOG_ONLY` / `TAPUZ_TEST` / `TAPUZ_PROD` |

---

## 3. קבצי הקוד

### 3.1 `backend/events.js` — קליטת הזמנה וניתוב

```javascript
import wixData from 'wix-data';
import { orders } from 'wix-ecom-backend';
import { getProductById, notifyOwner } from 'backend/tapuzUtils';
import { processTapuzDelivery } from 'backend/tapuzApi';

export async function wixStores_onNewOrder(event) {
    try {
        const orderId = event.orderId;
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const order = await orders.getOrder(orderId);
        const config = await wixData.get("AppConfig", "SINGLE_ITEM_ID", { suppressAuth: true });
        const isTestMode = (config?.apiMode === "TAPUZ_TEST");
        
        const shippingTitle = order.shippingInfo?.title || "";
        const isPickup = shippingTitle.includes("איסוף") || shippingTitle.includes("Pickup");

        if (config?.automationMode === "MANUAL") {
            await routeToManual(order, "המערכת מוגדרת למצב ידני גורף");
            return;
        }

        if (isPickup) {
            await routeToManual(order, "איסוף עצמי");
            return;
        }

        let shouldRouteToManual = false;
        let manualReason = "";
        let tapuzRule = null;

        for (const item of order.lineItems) {
            const productId = item.catalogReference?.catalogItemId;
            if (!productId) continue; 
            
            let ruleQuery = await wixData.query("DeliveryRules").eq("product", productId).find({ suppressAuth: true });
            let rule = ruleQuery.items.length > 0 ? ruleQuery.items[0] : null;
            
            if (!rule) {
                const defaultRuleQuery = await wixData.query("DeliveryRules").eq("isDefault", true).find({ suppressAuth: true });
                if (defaultRuleQuery.items.length > 0) {
                    rule = defaultRuleQuery.items[0];
                } else {
                    shouldRouteToManual = true;
                    manualReason = "לא הוגדר חוק ניתוב לאחד המוצרים ואין ברירת מחדל";
                }
            }

            if (rule) {
                if (!tapuzRule) tapuzRule = rule;

                const productData = await getProductById(productId);
                const currentStock = productData?.stock?.quantity || 0;

                if (rule.inventoryAlertThreshold && currentStock <= rule.inventoryAlertThreshold) {
                    await notifyOwner("התראת מלאי - משלוחים", `המלאי של המוצר ${productData?.name} ירד ל-${currentStock}.`, isTestMode);
                }

                if (typeof rule.manualRoutingThreshold === 'number' && currentStock <= rule.manualRoutingThreshold) {
                    shouldRouteToManual = true;
                    manualReason = `מלאי נמוך (${currentStock}) למוצר ${productData?.name} - הועבר לידני`;
                }

                if (rule.deliveryType === "ידני") {
                    shouldRouteToManual = true;
                    manualReason = "אחד או יותר מהמוצרים מוגדר לניתוב ידני ב-CMS";
                }
            }
        }

        if (order.lineItems.length > 1) {
            shouldRouteToManual = true;
            manualReason = manualReason || "הזמנה מרובת פריטים";
        }

        if (shouldRouteToManual) {
            await routeToManual(order, manualReason);
        } else if (tapuzRule && tapuzRule.deliveryType === "תפוז") {
            const item = order.lineItems[0];
            await processTapuzDelivery(order, item, item.quantity, config);
        }

    } catch (error) {
        console.error("Fatal routing error:", error);
        await wixData.insert("SystemLogs", {
            status: "FATAL",
            message: `שגיאת מערכת קריטית בהזמנה: ${error.message}`
        }, { suppressAuth: true });
    }
}

async function routeToManual(order, reason) {
    await wixData.insert("ManualFulfillments", {
        orderId: order._id,
        orderNumber: String(order.number),
        reason: reason,
        isHandled: false
    }, { suppressAuth: true });
    
    await wixData.insert("SystemLogs", {
        orderNumber: String(order.number),
        status: "INFO",
        message: `נותב לידני: ${reason}`
    }, { suppressAuth: true });
}
```

---

### 3.2 `backend/tapuzApi.jsw` — תקשורת מול תפוז

```javascript
import { fetch } from 'wix-fetch';
import wixData from 'wix-data';
import wixStoresBackend from 'wix-stores-backend';

const SENDER_INFO = {
    city: "פתח תקווה",
    street: "החרש",
    houseNum: "6",
    companyName: "חן קלימיאן- לדבר עם ילדים TPL",
    zipCode: "4951822"
};

export async function processTapuzDelivery(order, lineItem, quantity, config) {
    let tapuzString = "";
    try {
        const customerCode = config.apiMode === "TAPUZ_TEST" ? "4041" : "הכנס_קוד_לקוח_אמיתי_כאן";
        tapuzString = buildTapuzString(order, quantity, customerCode, SENDER_INFO);

        if (config.apiMode === "LOG_ONLY") {
            await logSystem(order.number, "INFO", "LOG_ONLY MODE - מחרוזת נוצרה בהצלחה", tapuzString);
            return;
        }

        const soapRequest = `...`; // SOAP Envelope עם tapuzString

        const response = await fetch("http://crm.tapuzdelivery.co.il/baldarwebservice/Service.asmx", {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '"http://tempuri.org/SaveData1"' },
            body: soapRequest
        });

        const responseText = await response.text();
        const deliveryMatch = responseText.match(/<DeliveryNumber>(.*?)<\/DeliveryNumber>/);
        
        if (deliveryMatch?.[1] && !responseText.includes("-999") && !responseText.includes("-2")) {
            const deliveryNumber = deliveryMatch[1];
            await wixStoresBackend.createFulfillment(order._id, {
                lineItems: [{ index: lineItem.index || 1, quantity }],
                trackingInfo: {
                    shippingProvider: "Tapuz Delivery",
                    trackingNumber: deliveryNumber,
                    trackingLink: `https://crm.tapuzdelivery.co.il/baldar/deliverystatus.aspx?d=${deliveryNumber}`
                }
            });
            await logSystem(order.number, "SUCCESS", `המשלוח נקלט בתפוז: ${deliveryNumber}`, tapuzString, responseText);
        } else {
            throw new Error(`שגיאה מתפוז: ${responseText}`);
        }
    } catch (error) {
        await logSystem(order.number, "ERROR", `כשל בשידור לתפוז: ${error.message}`, tapuzString);
        await wixData.insert("ManualFulfillments", {
            orderId: order._id,
            orderNumber: String(order.number),
            reason: "שגיאת תקשורת מול תפוז - דורש טיפול ידני",
            isHandled: false
        }, { suppressAuth: true });
    }
}
```

**מבנה מחרוזת תפוז (37 שדות, מופרדים בנקודה-פסיק):**

| # | שדה | ערך לדוגמה |
|---|-----|------------|
| 1 | סוג משלוח | `1` (שליחות) |
| 2 | רחוב מוצא | `החרש` |
| 3 | מס' בית מוצא | `6` |
| 4 | עיר מוצא | `פתח תקווה` |
| 5 | רחוב יעד | מהזמנה |
| 6 | מס' בית יעד | מהזמנה |
| 7 | עיר יעד | מהזמנה |
| 8 | שם חברה מוצא | `חן קלימיאן- לדבר עם ילדים TPL` |
| 9 | שם נמען | מהזמנה |
| 10 | הוראות משלוח | `buyerNote` |
| 11 | דחיפות | `1` (רגיל) |
| 14 | מספר חבילות | מחושב: `ceil(qty / 15)` |
| 15 | משלוח כפול | `2` אם qty > 15, אחרת `1` |
| 17 | מס' הזמנה | `order.number` |
| 18 | קוד לקוח תפוז | `4041` בטסט |
| 25 | טלפון נייד | מהזמנה |
| 27 | תאריך שידור | `YYYY-MM-DD` |

---

### 3.3 `backend/tapuzUtils.jsw` — פונקציות עזר

```javascript
import { products } from 'wix-stores.v2';
import { triggeredEmails } from 'wix-crm-backend';

export async function getProductById(productId) { ... }

export async function notifyOwner(subject, body, isTestMode = false) {
    // שולח לתבנית VCQp4lt
    // isTestMode=true  → ContactID: 48cce6ed-...
    // isTestMode=false → ContactID: 22033acd-...
}
```

---

## 4. מדריך בדיקות ומעבר לפרודקשן

### מצבי הרצה (`apiMode`)

| מצב | התנהגות |
|-----|---------|
| `LOG_ONLY` | יוצר מחרוזת תפוז ורושם ב-SystemLogs — **ללא שליחה לשרת** |
| `TAPUZ_TEST` | שולח לשרת תפוז עם **קוד לקוח 4041** (דמה) |
| `TAPUZ_PROD` | שולח לשרת תפוז עם **קוד לקוח אמיתי** |

> ⚠️ **חשוב:** לפני הרצת טסטים ב-`TAPUZ_TEST` — יש להודיע לנציג תפוז (גיא: 050-9964699 / guy.g@tapuzdelivery.co.il) כדי שלא ייצא שליח לחבילת דמה.

### צעדים למעבר ל-`TAPUZ_PROD`

1. קבלת קוד לקוח אמיתי מתפוז.
2. בקובץ `tapuzApi.jsw`, עדכן את השורה:
   ```javascript
   const customerCode = config.apiMode === "TAPUZ_TEST" ? "4041" : "הקוד_האמיתי_שלך";
   ```
3. עדכן את `apiMode` ב-AppConfig ל-`TAPUZ_PROD`.

### צ'קליסט בדיקות

- [ ] יצירת הזמנה רגילה → לוג `SUCCESS` ב-SystemLogs
- [ ] יצירת הזמנה עם איסוף עצמי → רשומה ב-ManualFulfillments
- [ ] הזמנה עם שני מוצרים שונים → רשומה ב-ManualFulfillments
- [ ] הורדת מלאי מתחת ל-`inventoryAlertThreshold` → מייל לבעלת האתר
- [ ] הורדת מלאי מתחת ל-`manualRoutingThreshold` → ניתוב ידני אוטומטי
- [ ] הגדרת `automationMode = MANUAL` → כל ההזמנות לידני
