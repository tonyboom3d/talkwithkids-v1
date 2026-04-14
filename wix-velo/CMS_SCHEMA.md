# Wix CMS Collections Schema

## 1. DashboardOrders

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| orderNumber | מספר הזמנה | Text | Wix Order Number לאחר אישור תשלום |
| deliveryNumber | מספר משלוח | Text | מספר המשלוח מתפוז לאחר קליטת שילוח |
| checkoutId | מזהה צ'קאאוט | Text | From Wix Ecom |
| status | סטטוס | Text | sent/opened/unpaid/cancelled/error/paid/paid_partial/paid_pending_details/paid_completed |
| createdByRef | נוצר ע"י | Reference -> AuthorizedEmployees | |
| paymentMethod | אופן תשלום | Text | ביט/פייבוקס/הוראת קבע/העברה בנקאית/קארדקום/וויקס |
| partialPaidAmount | סכום ששולם חלקית | Number | נשמר כששולם חלק מהסכום מראש |
| products | מוצרים | Text | JSON array |
| totalPrice | מחיר סה"כ | Number | |
| couponId | מזהה קופון | Text | |
| couponDetails | פרטי קופון | Text | JSON: {type, value, code} |
| notes | הערות פנימיות | Text | Not shown to customer |
| orderChangeNotes | הערות לשינוי | Text | Affects shipping routing |
| changeChain | שרשרת שינויים | Text | JSON array |
| payerContactId | מזהה Contact | Text | |
| payerMemberRef | Member | Reference -> Members | Created after payment |
| checkoutLink | קישור צ'קאאוט | URL | מתעדכן בכל לחיצת לקוח על כפתור התשלום (לא נוצר מראש) |
| checkoutSessionData | נתוני יצירת Checkout | Text | JSON: `{ version, draft: { products, orderChangeNotes, couponCode, lockCouponCode }, history: [{ checkoutId, checkoutUrl, createdAt, source }], latest }` |
| dynamicLinkId | מזהה דינמי | Text | 16 תווים מ־\_id; קישור ציבורי: `…/dashboard-orders?id={dynamicLinkId}` |
| dynamicOrderUrl | קישור ציבורי להזמנה | URL | מתמלא אוטומטית ביצירת ההזמנה (`…/dashboard-orders?id=…`) |
| errors | שגיאות | Text | JSON |
| completedOrderData | נתוני הזמנה מושלמת | Text | JSON |
| customerName | שם לקוח | Text | |
| customerPhone | טלפון לקוח | Text | |
| customerEmail | אימייל לקוח | Text | |

**Permissions**: Read = Admin, Write = Admin (all access via suppressAuth: true in backend)

**State transitions**
- `sent` -> `opened` כאשר הלקוח/ה נכנס/ת לקישור הציבורי.
- `paid_partial` -> `paid` לאחר השלמת יתרת התשלום.
- `paid_pending_details` -> `paid_completed` לאחר אישור תשלום.
- כל תשלום מוצלח אחר -> `paid`.

## 2. AuthorizedEmployees

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| connectedMembers | משתמש מחובר | Reference -> Members (פריט אחד) | גישה לדאשבורד כש־memberId של המשתמש המחובר תואם לרפרנס |
| displayName | שם להצגה | Text | חן/חני/לני |
| color (או Color) | צבע תגית | Text / Color | מומלץ `#RRGGBB` או `#RGB` — מוצג בטבלה; אם השדה בוויקס נקרא אחרת, לעדכן בקוד או לשמור גם כ־`color` |
| canViewOtherRecords | צפייה ברשומות אחרות | Boolean | |
| commissionRate | אחוז עמלה | Number | For profit calculations |

## 3. ProductGroups

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| title | שם הקבוצה | Text | |
| productIds | מוצרים | Text | JSON array of product IDs |
| pricingPlanIds | תוכניות | Text | JSON array of plan IDs |
| shippingMethod | שיטת משלוח | Text | |

## 4. ProductPlanMapping

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| productId | מוצר | Text | Wix Store product ID |
| pricingPlanId | תוכנית | Text | Pricing Plan ID |
| planDuration | משך תוכנית | Text | "unlimited" |

## 5. ManualFulfillments

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| orderNumber | מספר הזמנה | Text | |
| orderId | מזהה הזמנה | Text | |
| reason | סיבה | Text | למשל: "איסוף עצמי" / "הזמנה מרובת פריטים" |
| isHandled | טופל | Boolean | false = ממתין לטיפול |
| shippingAddress | כתובת משלוח | Text | JSON: {firstName, lastName, phone, email, street, streetNumber, city, zipCode} |

**Permissions**: Read = Admin, Write = Admin (all access via suppressAuth: true in backend)

## 6. ShippingRouting

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| orderRef | הזמנה | Reference -> DashboardOrders | |
| routedTo | ניתוב אל | Text | "chen" or "tapuz" |
| changeNote | הערת שינוי | Text | |
| handledDate | תאריך טיפול | Date | null until handled |

## 7. DeliveryRules

חוקי משלוח לפי מוצר. כל רשומה מגדירה כיצד לטפל במוצר בעת הזמנה.

**לוגיקת שדה deliveryType:**
- **"תפוז"** — המוצר נשלח אוטומטית דרך תפוז
- **"בית"** — המוצר נשלח ידנית מהבית (בהזמנה של פריט בודד בלבד)
- **ריק (ללא תגיות)** — המוצר לא נשלח כלל (מנוי דיגיטלי, תוכן, וכו'). המערכת תדלג עליו לחלוטין בחישוב המשלוח.

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| product | מוצר | Reference → Wix Catalog (Products) | |
| deliveryType | סוג משלוח | Tags | "תפוז" / "בית" / ריק = ללא משלוח |
| relatedPlan | תוכנית מנוי | Reference → PricingPlans | אופציונלי — אם ממולא, המערכת תשייך pricing plan ללקוח בעת רכישה |
| inventoryAlertThreshold | סף התראת מלאי | Number | שולח התראה כשהמלאי יורד מתחת לסף |
| manualRoutingThreshold | סף ניתוב ידני | Number | מנתב לתפוז ידני כשהמלאי נמוך מהסף |

**שימוש:**
- מוצר פיזי למשלוח תפוז: `deliveryType = ["תפוז"]`
- מוצר פיזי למשלוח ידני מהבית: `deliveryType = ["בית"]`
- מוצר דיגיטלי/מנוי ללא משלוח עם תוכנית: `deliveryType = []` + `relatedPlan = <plan_id>`
- מוצר דיגיטלי ללא שום טיפול: אין צורך ברשומה כלל, או רשומה עם `deliveryType` ריק

**Permissions**: Read = Admin, Write = Admin (all access via suppressAuth: true in backend)

