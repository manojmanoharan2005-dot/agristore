import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.warn('Mail credentials missing — refund email disabled');
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    },
    tls: { rejectUnauthorized: false }
  });
};

const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

export const sendRefundConfirmationEmail = async (order, user) => {
  const transporter = createTransporter();
  if (!transporter) return;

  const orderId = order._id.toString().slice(-8).toUpperCase();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Refund Initiated - AgriStore</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    
    <div style="background:#0f172a;padding:32px;text-align:center;">
      <h1 style="color:#10b981;margin:0;font-size:30px;">🌱 AgriStore</h1>
      <p style="color:#64748b;margin:8px 0 0;font-size:14px;">Your Trusted Agricultural Partner</p>
    </div>

    <div style="padding:32px;">
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h2 style="color:#92400e;margin:0 0 8px;font-size:22px;">🔄 Refund Initiated</h2>
        <p style="color:#78350f;margin:0;">Dear ${user.name}, your refund has been initiated and is being processed.</p>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0f172a;">#${orderId}</p>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Cancelled On</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#0f172a;">${formatDate(new Date())}</p>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Refund Amount</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#10b981;">${formatCurrency(order.totalAmount)}</p>
        </div>
      </div>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#0369a1;margin:0 0 12px;">Refund Details</h3>
        <p style="margin:0 0 8px;color:#374151;">
          <strong>Refund ID:</strong> ${order.paymentDetails?.razorpay_refund_id || 'Processing...'}
        </p>
        <p style="margin:0 0 8px;color:#374151;">
          <strong>Original Payment ID:</strong> ${order.paymentDetails?.razorpay_payment_id || 'N/A'}
        </p>
        <p style="margin:0;color:#374151;">
          <strong>Status:</strong> <span style="color:#d97706;font-weight:600;">Pending (3–5 business days)</span>
        </p>
      </div>

      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
        <h4 style="margin:0 0 8px;color:#0f172a;">What happens next?</h4>
        <ul style="margin:0;padding-left:20px;color:#4b5563;line-height:1.8;">
          <li>Your refund of <strong>${formatCurrency(order.totalAmount)}</strong> will be credited within <strong>3–5 business days</strong></li>
          <li>The amount will be refunded to your original payment method</li>
          <li>You'll receive a bank notification once the refund is processed</li>
          <li>For any queries, contact our support team</li>
        </ul>
      </div>

      <p style="color:#6b7280;font-size:14px;">
        We're sorry to see your order cancelled. If you have any queries about your refund, 
        please contact us with your Order ID: <strong>#${orderId}</strong>.
      </p>
    </div>

    <div style="background:#0f172a;padding:24px;text-align:center;">
      <p style="color:#94a3b8;margin:0;font-size:13px;">© 2025 AgriStore — Empowering Indian Farmers 🌾</p>
      <p style="color:#475569;margin:6px 0 0;font-size:12px;">This is an automated email. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"AgriStore Orders" <${process.env.MAIL_FROM}>`,
    to: user.email,
    subject: `Refund Initiated for Order #${orderId} — AgriStore`,
    html
  });
};
