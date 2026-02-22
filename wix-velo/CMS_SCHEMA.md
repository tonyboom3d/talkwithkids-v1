# Wix CMS Collections Schema

## 1. DashboardOrders

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| orderNumber | מספר הזמנה | Text | TWK-1001, TWK-1002... |
| checkoutId | מזהה צ'קאאוט | Text | From Wix Ecom |
| status | סטטוס | Text | sent/opened/unpaid/cancelled/error/paid |
| createdByRef | נוצר ע"י | Reference -> AuthorizedEmployees | |
| paymentMethod | אופן תשלום | Text | ביט/פייבוקס/הוראת קבע/העברה בנקאית/קארדקום/וויקס |
| products | מוצרים | Text | JSON array |
| totalPrice | מחיר סה"כ | Number | |
| couponId | מזהה קופון | Text | |
| couponDetails | פרטי קופון | Text | JSON: {type, value, code} |
| notes | הערות פנימיות | Text | Not shown to customer |
| orderChangeNotes | הערות לשינוי | Text | Affects shipping routing |
| changeChain | שרשרת שינויים | Text | JSON array |
| payerContactId | מזהה Contact | Text | |
| payerMemberRef | Member | Reference -> Members | Created after payment |
| checkoutLink | קישור צ'קאאוט | URL | |
| dynamicLinkId | מזהה דינמי | Text | 16 chars from _id |
| errors | שגיאות | Text | JSON |
| completedOrderData | נתוני הזמנה מושלמת | Text | JSON |
| customerName | שם לקוח | Text | |
| customerPhone | טלפון לקוח | Text | |
| customerEmail | אימייל לקוח | Text | |

**Permissions**: Read = Admin, Write = Admin (all access via suppressAuth: true in backend)

## 2. AuthorizedEmployees

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| memberRef | משתמש | Reference -> Members/PrivateMembersData | |
| displayName | שם להצגה | Text | חן/חני/לני |
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

## 5. ShippingRouting

| Field ID | Display Name | Type | Notes |
|----------|-------------|------|-------|
| orderRef | הזמנה | Reference -> DashboardOrders | |
| routedTo | ניתוב אל | Text | "chen" or "tapuz" |
| changeNote | הערת שינוי | Text | |
| handledDate | תאריך טיפול | Date | null until handled |
