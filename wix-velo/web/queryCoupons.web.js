/**
 * Web module — אופציונלי לקריאה מדפי אתר בוויקס (לא מה-iframe ב-GitHub Pages).
 * הדאשבורד משתמש ב-backend/dashboardApi.jsw (searchStoreCoupons) דרך postMessage.
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
