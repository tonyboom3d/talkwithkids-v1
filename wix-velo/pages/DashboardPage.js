// ────────────────────────────────────────────────────────────────────────────
// Wix Velo Page Code - Dashboard Page
// This code runs on the page that contains the iframe ($w('#dashboardIframe'))
// ────────────────────────────────────────────────────────────────────────────

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';
import {
  getEmployeePermissions,
  getOrderRecords,
  getOrderDetails,
  createOrderRecord,
  sendOrderWhatsapp,
  addOrderNote,
  cancelOrderLink,
  resendOrderWhatsapp,
  updateOrderStatus,
  deleteOrderRecord,
  getStoreProducts,
  searchContactsByQuery,
  searchStoreCoupons,
} from 'backend/dashboardApi.jsw';

const MSG_TYPE = 'TWK_MSG';
const IFRAME_ORIGIN = null; // GitHub Pages origin - set after deploy, e.g. 'https://username.github.io'
const LOG_PREFIX = '[VELO-PAGE]';

let currentEmployee = null;

$w.onReady(async () => {
  console.log(`${LOG_PREFIX} Page ready, initializing...`);

  $w('#dashboardIframe').onMessage((event) => {
    handleIframeMessage(event.data);
  });

  try {
    const member = await currentMember.getMember();
    if (!member) {
      sendToIframe('ERROR', { code: 'NO_MEMBER', message: 'לא נמצא משתמש מחובר', action: 'INIT' });
      return;
    }

    const employee = await getEmployeePermissions(member._id);
    if (!employee) {
      sendToIframe('ERROR', { code: 'NOT_AUTHORIZED', message: 'אין הרשאת גישה לדאשבורד', action: 'INIT' });
      return;
    }

    currentEmployee = {
      ...employee,
      memberId: member._id,
    };

    sendToIframe('USER_READY', {
      user: {
        id: employee._id,
        memberId: member._id,
        displayName: employee.displayName,
      },
      canViewOthers: employee.canViewOtherRecords,
      commissionRate: employee.commissionRate,
    });

    console.log(`${LOG_PREFIX} User ready: ${employee.displayName}`);
  } catch (err) {
    console.error(`${LOG_PREFIX} Init error:`, err);
    sendToIframe('ERROR', { code: 'INIT_FAILED', message: err.message, action: 'INIT' });
  }
});

function sendToIframe(action, payload, requestId) {
  const msg = { type: MSG_TYPE, action, payload };
  if (requestId) msg.requestId = requestId;
  $w('#dashboardIframe').postMessage(msg);
}

async function handleIframeMessage(data) {
  if (!data || data.type !== MSG_TYPE) return;

  const { action, requestId, payload } = data;

  if (!currentEmployee && action !== 'INIT') {
    sendToIframe('ERROR', { code: 'NOT_READY', message: 'המערכת עדיין לא מוכנה', action }, requestId);
    return;
  }

  try {
    switch (action) {
      case 'INIT':
        // Already handled in $w.onReady
        break;

      case 'GET_ORDERS': {
        const orders = await getOrderRecords(
          currentEmployee._id,
          currentEmployee.canViewOtherRecords
        );
        sendToIframe('ORDERS_RESULT', { orders }, requestId);
        break;
      }

      case 'SEARCH_CONTACTS': {
        console.log(`${LOG_PREFIX} SEARCH_CONTACTS query=`, payload?.query);
        const contacts = await searchContactsByQuery(payload.query);
        console.log(`${LOG_PREFIX} SEARCH_CONTACTS returned ${contacts?.length ?? 0} contacts`);
        sendToIframe('CONTACTS_RESULT', { contacts }, requestId);
        break;
      }

      case 'SEARCH_COUPONS': {
        const coupons = await searchStoreCoupons(payload.query || '');
        sendToIframe('COUPONS_RESULT', { coupons }, requestId);
        break;
      }

      case 'CREATE_ORDER': {
        const result = await createOrderRecord(payload, currentEmployee._id, currentEmployee.displayName);
        sendToIframe('ORDER_CREATED', result, requestId);
        break;
      }

      case 'SEND_ORDER_WHATSAPP': {
        await sendOrderWhatsapp(payload.recordId, currentEmployee.displayName);
        sendToIframe('ORDER_WHATSAPP_SENT', { success: true }, requestId);
        break;
      }

      case 'GET_ORDER_DETAILS': {
        const order = await getOrderDetails(payload.recordId);
        sendToIframe('ORDER_DETAILS', { order }, requestId);
        break;
      }

      case 'ADD_ORDER_NOTE': {
        await addOrderNote(payload.recordId, payload.note, currentEmployee.displayName);
        sendToIframe('NOTE_ADDED', { success: true }, requestId);
        break;
      }

      case 'CANCEL_LINK': {
        await cancelOrderLink(payload.recordId, currentEmployee.displayName);
        sendToIframe('LINK_CANCELLED', { success: true }, requestId);
        break;
      }

      case 'RESEND_ORDER_WHATSAPP': {
        await resendOrderWhatsapp(payload.recordId, currentEmployee.displayName);
        sendToIframe('ORDER_WHATSAPP_RESENT', { success: true }, requestId);
        break;
      }

      case 'UPDATE_ORDER_STATUS': {
        await updateOrderStatus(payload.recordId, payload.status, currentEmployee.displayName);
        sendToIframe('ORDER_STATUS_SAVED', { success: true }, requestId);
        break;
      }

      case 'DELETE_ORDER': {
        await deleteOrderRecord(payload.recordId, currentEmployee.displayName);
        sendToIframe('ORDER_DELETED', { success: true }, requestId);
        break;
      }

      case 'COPY_TO_CLIPBOARD': {
        await wixWindowFrontend.copyToClipboard(payload.text || '');
        sendToIframe('CLIPBOARD_COPIED', { success: true }, requestId);
        break;
      }

      case 'GET_PRODUCTS': {
        const products = await getStoreProducts();
        sendToIframe('PRODUCTS_RESULT', { products }, requestId);
        break;
      }

      default:
        console.warn(`${LOG_PREFIX} Unknown action: ${action}`);
        sendToIframe('ERROR', { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}`, action }, requestId);
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Error handling ${action}:`, err);
    sendToIframe('ERROR', { code: 'SERVER_ERROR', message: err.message, action }, requestId);
  }
}
