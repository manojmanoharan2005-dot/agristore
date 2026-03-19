import https from 'https';

const sendViaBrevoApi = async (mailPayload) => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('Brevo API key missing — email notifications disabled');
    return false;
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(mailPayload);
    const dataLength = Buffer.byteLength(data, 'utf8');
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': dataLength
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          reject(new Error(`Brevo API error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

const getStatusSealMeta = (status) => {
  const map = {
    pending: { label: 'PENDING SEAL', bg: '#FEF3C7', border: '#F59E0B', color: '#B45309' },
    confirmed: { label: 'CONFIRMED SEAL', bg: '#DCFCE7', border: '#22C55E', color: '#15803D' },
    processing: { label: 'PROCESSING SEAL', bg: '#DBEAFE', border: '#3B82F6', color: '#1D4ED8' },
    shipped: { label: 'SHIPPED SEAL', bg: '#E0F2FE', border: '#0EA5E9', color: '#0369A1' },
    delivered: { label: 'DELIVERED SEAL', bg: '#D1FAE5', border: '#10B981', color: '#047857' },
    cancelled: { label: 'CANCELLED SEAL', bg: '#FEE2E2', border: '#EF4444', color: '#B91C1C' },
    otp: { label: 'SECURE OTP SEAL', bg: '#F0FDF4', border: '#10B981', color: '#047857' }
  };
  return map[status] || { label: String(status || 'STATUS').toUpperCase(), bg: '#E2E8F0', border: '#94A3B8', color: '#334155' };
};

const renderStatusSealHtml = (status, dateStr) => {
  const seal = getStatusSealMeta(status);
  const sealText = seal.label.replace(' SEAL', '');
  const dateFormatted = dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : null;

  return `
  <div style="display:inline-block; margin-top: 20px;">
    <div style="transform: rotate(-15deg); -webkit-transform: rotate(-15deg); display:inline-block;">
      <div style="width: 160px; height: 160px; border: 5px solid ${seal.color}; border-radius: 50%; padding: 4px; box-sizing: border-box;">
        <div style="width: 142px; height: 142px; border: 2px dashed ${seal.color}; border-radius: 50%; box-sizing: border-box; display: table;">
          <div style="display: table-cell; vertical-align: middle; text-align: center;">
            <div style="color:${seal.color}; font-size:18px; margin-bottom:6px; letter-spacing:4px;">★★★</div>
            <div style="background: #fff; padding: 6px 0; border-top: 1px solid ${seal.color}; border-bottom: 1px solid ${seal.color}; margin-left: -10px; margin-right: -10px;">
              <span style="font-size:16px; font-weight:900; color:${seal.color}; font-family:'Arial Black', Arial, sans-serif; letter-spacing:1px; display:block;">${sealText}</span>
              ${dateFormatted ? `<span style="font-size:10px; font-weight:700; color:${seal.color}; font-family:Arial, sans-serif; letter-spacing:1px; display:block; margin-top:2px;">${dateFormatted}</span>` : ''}
            </div>
            <div style="color:${seal.color}; font-size:18px; margin-top:6px; letter-spacing:4px;">★★★</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
};

export const sendOrderConfirmationEmail = async (order, user) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;color:#374151;">
        ${item.name}
        ${item.manufacturer ? `<br><small style="color:#9ca3af;">${item.manufacturer}</small>` : ''}
      </td>
      <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;">${item.quantity}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;">${formatCurrency(item.price)}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#0f172a;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('');

  const orderId = order._id.toString().slice(-8).toUpperCase();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Order Confirmed - AgriStore</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    
    <div style="background:#0f172a;padding:36px;text-align:center;">
      <h1 style="color:#10b981;margin:0;font-size:32px;letter-spacing:-0.5px;">🌱 AgriStore</h1>
      <p style="color:#64748b;margin:8px 0 0;font-size:14px;">Your Trusted Agricultural Partner</p>
    </div>

    <div style="padding:40px 32px;">
      <table style="width:100%;margin-bottom:32px;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:16px;overflow:hidden;" cellpadding="24">
        <tr>
          <td style="vertical-align:middle;">
            <h2 style="color:#15803d;margin:0 0 8px;font-size:24px;">✅ Order Confirmed!</h2>
            <p style="color:#166534;margin:0;font-size:15px;line-height:1.5;">Dear ${user.name}, your order has been successfully placed. We are preparing it for shipment.</p>
          </td>
        </tr>
      </table>

      <table style="width:100%;margin-bottom:32px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;width:33%;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Order ID</p>
            <p style="margin:6px 0 0;font-size:16px;font-weight:800;color:#0f172a;">#${orderId}</p>
          </td>
          <td style="width:12px;"></td>
          <td style="padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;width:33%;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Order Date</p>
            <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:#0f172a;">${formatDate(order.orderDate)}</p>
          </td>
          <td style="width:12px;"></td>
          <td style="padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;width:33%;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Payment</p>
            <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:#0f172a;text-transform:capitalize;">${order.paymentMethod}</p>
          </td>
        </tr>
      </table>

      <h3 style="color:#0f172a;margin:0 0 16px;font-size:18px;">Order Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <thead>
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <th style="padding:12px 16px;text-align:left;color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.5px;">PRODUCT</th>
            <th style="padding:12px 16px;text-align:center;color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.5px;">QTY</th>
            <th style="padding:12px 16px;text-align:right;color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.5px;">PRICE</th>
            <th style="padding:12px 16px;text-align:right;color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.5px;">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc;border-top:1px solid #e2e8f0;">
            <td colspan="3" style="padding:20px 16px;text-align:right;font-size:15px;color:#475569;font-weight:700;">Grand Total:</td>
            <td style="padding:20px 16px;text-align:right;font-size:20px;font-weight:900;color:#10b981;">${formatCurrency(order.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="text-align:right; margin-top:20px; margin-bottom:32px; padding-right:16px;">
        ${renderStatusSealHtml('confirmed', order.orderDate)}
      </div>

      <h3 style="color:#0f172a;margin:0 0 16px;font-size:18px;">Shipping Destination</h3>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <p style="margin:0;font-size:16px;font-weight:800;color:#0f172a;">${order.shippingAddress.name}</p>
        <p style="margin:8px 0 0;color:#475569;font-size:14px;line-height:1.5;">${order.shippingAddress.street}</p>
        <p style="margin:4px 0 0;color:#475569;font-size:14px;">${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pincode}</p>
        <p style="margin:12px 0 0;color:#334155;font-size:14px;font-weight:600;">📞 ${order.shippingAddress.phone}</p>
      </div>

      <p style="margin:32px 0 0;color:#64748b;font-size:14px;line-height:1.6;text-align:center;background:#eff6ff;padding:16px;border-radius:12px;border:1px dashed #bfdbfe;">
        We will notify you once your order is shipped. Expected delivery is within <strong>3–7 business days</strong>.
      </p>
    </div>

    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#64748b;margin:0;font-size:13px;">© ${new Date().getFullYear()} AgriStore — Empowering Indian Farmers 🌾</p>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:12px;">This is an automated email. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`;

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'AgriStore',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@agristore.com'
    },
    to: [{ email: user.email, name: user.name }],
    subject: `Order Confirmed #${orderId} — AgriStore`,
    htmlContent: html
  };

  try {
    await sendViaBrevoApi(payload);
  } catch (error) {
    console.error('Order email send failed:', error.message);
  }
};

export const sendLoginOtpEmail = async ({ to, name, otp }) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Your AgriStore Login OTP</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    
    <div style="background:#0f172a;padding:36px;text-align:center;">
      <h1 style="color:#10b981;margin:0;font-size:32px;letter-spacing:-0.5px;">🌱 AgriStore</h1>
      <p style="color:#64748b;margin:8px 0 0;font-size:14px;">Your Trusted Agricultural Partner</p>
    </div>

    <div style="padding:48px 32px;text-align:center;">
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:24px;">Secure Login Verification</h2>
      <p style="margin:0 0 24px;color:#4b5563;font-size:16px;">Hi ${name || 'there'},</p>
      <p style="margin:0 0 36px;color:#6b7280;font-size:15px;line-height:1.6;max-width:440px;margin-left:auto;margin-right:auto;">
        Please use the One-Time Password (OTP) below to securely sign in to your AgriStore account.
      </p>

      <div style="background:#f0fdf4;border:2px dashed #6ee7b7;border-radius:16px;overflow:hidden;max-width:400px;margin:0 auto 36px;">
        <table style="width:100%;" cellpadding="24">
          <tr>
            <td style="vertical-align:middle;">
              <p style="margin:0;color:#166534;font-size:12px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;">Authentication Code</p>
              <p style="margin:16px 0 0;color:#064e3b;font-size:42px;font-weight:900;letter-spacing:10px;">${otp}</p>
            </td>
            <td style="vertical-align:middle;text-align:right;width:90px;padding-left:0;">
              <div style="transform:scale(0.85);transform-origin:right center;">${renderStatusSealHtml('otp', new Date())}</div>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:0;color:#ef4444;font-size:14px;font-weight:600;">
        ⚠️ This code expires in 10 minutes.
      </p>
      <p style="margin:12px 0 0;color:#9ca3af;font-size:13px;">
        If you did not request this login, please ignore this email or contact support.
      </p>
    </div>

    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#64748b;margin:0;font-size:13px;">© ${new Date().getFullYear()} AgriStore — Empowering Indian Farmers 🌾</p>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:12px;">This is an automated security email. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`;

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'AgriStore',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@agristore.com'
    },
    to: [{ email: to, name: name || 'User' }],
    subject: 'Your AgriStore Login OTP',
    htmlContent: html
  };

  try {
    await sendViaBrevoApi(payload);
    return true;
  } catch (error) {
    console.error('OTP email send failed:', error.message);
    return false;
  }
};

const getStatusMeta = (status) => {
  const map = {
    pending: { title: 'Order Received', color: '#f59e0b', text: 'Your order has been received and is awaiting confirmation.' },
    confirmed: { title: 'Order Confirmed', color: '#10b981', text: 'Your order is confirmed and will be prepared soon.' },
    processing: { title: 'Order Processing', color: '#3b82f6', text: 'Your order is currently being packed and processed.' },
    shipped: { title: 'Order Shipped', color: '#0ea5e9', text: 'Your order is on the way to your delivery address.' },
    delivered: { title: 'Order Delivered', color: '#16a34a', text: 'Your order has been delivered successfully.' },
    cancelled: { title: 'Order Cancelled', color: '#ef4444', text: 'Your order has been cancelled as requested.' }
  };
  return map[status] || {
    title: 'Order Status Updated',
    color: '#64748b',
    text: `Your order status has been updated to ${status}.`
  };
};

export const sendOrderStatusEmail = async (order, user, status, customText) => {
  if (!user?.email) return;

  const meta = getStatusMeta(status);
  const orderId = order._id.toString().slice(-8).toUpperCase();
  const itemsHtml = (order.items || []).map((item) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#334155;">${item.name}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#334155;">${item.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0f172a;font-weight:700;">${formatCurrency(item.subtotal || (item.price * item.quantity))}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${meta.title} - AgriStore</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:620px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0f172a;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#10b981;font-size:28px;">AgriStore</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Order Update Notification</p>
    </div>

    <div style="padding:24px;">
      <div style="background:${meta.color}15;border:1px solid ${meta.color}40;border-radius:10px;padding:16px;margin-bottom:20px;">
        <h2 style="margin:0 0 6px;color:${meta.color};font-size:22px;">${meta.title}</h2>
        <p style="margin:0;color:#1f2937;line-height:1.5;">${customText || meta.text}</p>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:18px;">
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:12px;">
          <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Order ID</p>
          <p style="margin:5px 0 0;font-size:16px;color:#0f172a;font-weight:700;">#${orderId}</p>
        </div>
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:12px;">
          <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Current Status</p>
          <p style="margin:5px 0 0;font-size:16px;color:${meta.color};font-weight:700;text-transform:capitalize;">${status}</p>
        </div>
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:12px;">
          <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Order Total</p>
          <p style="margin:5px 0 0;font-size:16px;color:#0f172a;font-weight:700;">${formatCurrency(order.totalAmount)}</p>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px;text-align:left;color:#64748b;font-size:12px;">Product</th>
            <th style="padding:10px;text-align:center;color:#64748b;font-size:12px;">Qty</th>
            <th style="padding:10px;text-align:right;color:#64748b;font-size:12px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="text-align:right; margin-top:20px; margin-bottom:24px; margin-right:16px;">
        ${renderStatusSealHtml(status, new Date())}
      </div>

      <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Delivery to: ${order.shippingAddress?.name || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}</p>
    </div>

    <div style="background:#0f172a;padding:18px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">This is an automated email from AgriStore.</p>
    </div>
  </div>
</body>
</html>`;

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'AgriStore',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@agristore.com'
    },
    to: [{ email: user.email, name: user.name || 'Customer' }],
    subject: `${meta.title} #${orderId} — AgriStore`,
    htmlContent: html
  };

  try {
    await sendViaBrevoApi(payload);
  } catch (error) {
    console.error('Order status email failed:', error.message);
  }
};

export const sendRefundStatusEmail = async (order, user, refundStatus) => {
  if (!user?.email) return;

  const orderId = order._id.toString().slice(-8).toUpperCase();
  const refundText = refundStatus === 'processed'
    ? 'Your refund has been processed successfully by our payment gateway. Please allow 5-7 business days for the amount to reflect in your original payment method.'
    : refundStatus === 'failed'
      ? 'We could not process your refund automatically. Our support team will contact you shortly.'
      : 'Your refund has been initiated and is currently under processing. It typically takes 5-7 business days to complete.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Refund Update - AgriStore</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0f172a;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#10b981;font-size:28px;">AgriStore</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Refund Status Update</p>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 10px;color:#0f172a;font-size:22px;">Refund ${refundStatus === 'processed' ? 'Completed' : refundStatus === 'failed' ? 'Failed' : 'Initiated'}</h2>
      <p style="margin:0 0 16px;color:#374151;line-height:1.6;">${refundText}</p>
      <div style="background:#f8fafc;border-radius:10px;padding:14px;">
        <p style="margin:0 0 6px;color:#64748b;font-size:13px;">Order ID: <strong style="color:#0f172a;">#${orderId}</strong></p>
        <p style="margin:0 0 6px;color:#64748b;font-size:13px;">Refund Amount: <strong style="color:#16a34a;">${formatCurrency(order.totalAmount)}</strong></p>
        <p style="margin:0;color:#64748b;font-size:13px;">Refund Reference: <strong style="color:#0f172a;">${order.paymentDetails?.razorpay_refund_id || 'Processing'}</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'AgriStore',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@agristore.com'
    },
    to: [{ email: user.email, name: user.name || 'Customer' }],
    subject: `Refund ${refundStatus} for Order #${orderId} — AgriStore`,
    htmlContent: html
  };

  try {
    await sendViaBrevoApi(payload);
  } catch (error) {
    console.error('Refund status email failed:', error.message);
  }
};
