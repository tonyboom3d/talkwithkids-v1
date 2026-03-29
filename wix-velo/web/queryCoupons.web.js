/**
 * Web module (אופציונלי) — אם לא בשימוש, אפשר להסיר.
 * חיפוש קופונים בדאשבורד: דרך `wixData.query('Marketing/Coupons')` ב־`backend/helpers/couponHelper.js`.
 */
import { coupons } from 'wix-marketing.v2';
import { webMethod, Permissions } from 'wix-web-module';
import { elevate } from 'wix-auth';

const elevatedQueryCoupons = elevate(coupons.queryCoupons);

export const queryCoupons = webMethod(Permissions.Anyone, async (query) => {
    try {
        const result = await elevatedQueryCoupons(query);
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
});
