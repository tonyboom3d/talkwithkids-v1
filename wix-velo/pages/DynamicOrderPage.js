// ────────────────────────────────────────────────────────────────────────────
// Wix Velo Page Code - Dynamic Order Page
// URL pattern: /order?id=XXXXXXXXXXXXXXXX (16 chars from record _id)
// This page shows a "continue to payment" button for the customer
// ────────────────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixLocation from 'wix-location';

const LOG_PREFIX = '[VELO-DYNAMIC]';

$w.onReady(async () => {
  const query = wixLocation.query;
  const dynamicId = query.id;

  if (!dynamicId || dynamicId.length < 10) {
    $w('#errorText').text = 'קישור לא תקין';
    $w('#errorText').show();
    $w('#payButton').hide();
    return;
  }

  try {
    const results = await wixData.query('DashboardOrders')
      .eq('dynamicLinkId', dynamicId)
      .find({ suppressAuth: true });

    if (results.items.length === 0) {
      $w('#errorText').text = 'ההזמנה לא נמצאה';
      $w('#errorText').show();
      $w('#payButton').hide();
      return;
    }

    const record = results.items[0];

    if (record.status === 'cancelled') {
      $w('#errorText').text = 'קישור זה בוטל';
      $w('#errorText').show();
      $w('#payButton').hide();
      return;
    }

    // Log "link opened" in change chain
    const chain = JSON.parse(record.changeChain || '[]');
    chain.push({
      action: 'link_opened',
      by: 'לקוח',
      date: new Date().toISOString(),
      detail: 'קישור נפתח',
    });

    await wixData.update('DashboardOrders', {
      ...record,
      status: record.status === 'sent' ? 'opened' : record.status,
      changeChain: JSON.stringify(chain),
    }, { suppressAuth: true });

    console.log(`${LOG_PREFIX} Link opened for order record, orderNumber=${record.orderNumber || '(עדיין ללא — אחרי תשלום)'}`);

    // Show order info (מספר TWK מוקצה רק לאחר תשלום)
    const num = record.orderNumber && String(record.orderNumber).trim();
    $w('#orderNumberText').text = num ? `הזמנה מס׳ ${num}` : 'הזמנה ממתינה לתשלום';
    $w('#totalText').text = `₪${record.totalPrice?.toLocaleString() || '0'}`;

    if (record.checkoutLink) {
      $w('#payButton').onClick(() => {
        wixLocation.to(record.checkoutLink);
      });
      $w('#payButton').show();
    } else {
      $w('#errorText').text = 'קישור התשלום לא זמין כרגע';
      $w('#errorText').show();
      $w('#payButton').hide();
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Dynamic page error:`, err);
    $w('#errorText').text = 'אירעה שגיאה בטעינת ההזמנה';
    $w('#errorText').show();
    $w('#payButton').hide();
  }
});
