import Order from '../models/Order.js';
import Product from '../models/Product.js';
import ReturnRequest from '../models/ReturnRequest.js';
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendRefundStatusEmail } from '../services/mailService.js';
import { getRazorpayInstance } from '../utils/razorpay.js';

const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric'
});

const getStatusSeal = (status) => {
  const map = {
    pending: { label: 'PENDING', bg: '#FEF3C7', border: '#F59E0B', color: '#B45309' },
    confirmed: { label: 'CONFIRMED', bg: '#DCFCE7', border: '#22C55E', color: '#15803D' },
    processing: { label: 'PROCESSING', bg: '#DBEAFE', border: '#3B82F6', color: '#1D4ED8' },
    shipped: { label: 'SHIPPED', bg: '#E0F2FE', border: '#0EA5E9', color: '#0369A1' },
    delivered: { label: 'DELIVERED', bg: '#D1FAE5', border: '#10B981', color: '#047857' },
    cancelled: { label: 'CANCELLED', bg: '#FEE2E2', border: '#EF4444', color: '#B91C1C' }
  };
  return map[status] || { label: String(status || 'STATUS').toUpperCase(), bg: '#E2E8F0', border: '#94A3B8', color: '#334155' };
};

const renderCircularSeal = ({ topText, centerText, bottomText, borderColor = '#1f2937', centerColor = '#0f172a' }) => {
  const circleRadius = 48;
  const textRadius = 42;
  const topAngle = -180;
  const chars = topText.split('');
  const charAngle = 360 / chars.length;
  
  const topTextPaths = chars.map((char, i) => {
    const angle = topAngle + (i * charAngle);
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * textRadius;
    const y = Math.sin(rad) * textRadius;
    return `<text x="${50 + x}" y="${50 + y}" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="800" letter-spacing="0.5" fill="${borderColor}" transform="rotate(${angle + 90} ${50 + x} ${50 + y})">${char}</text>`;
  }).join('');

  return `<div style="display:inline-flex;align-items:center;justify-content:center;width:140px;height:140px;">
    <svg width="140" height="140" viewBox="0 0 100 100" style="filter:drop-shadow(0 3px 10px rgba(15,23,42,0.2));">
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="${borderColor}" stroke-width="2.5"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="${borderColor}" stroke-width="1.5" stroke-dasharray="2,3" opacity="0.4"/>
      ${topTextPaths}
      <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="900" letter-spacing="0.6" fill="${centerColor}">${centerText}</text>
      <text x="50" y="63" text-anchor="middle" dominant-baseline="middle" font-size="7" font-weight="700" letter-spacing="0.8" fill="${borderColor}">${bottomText}</text>
      <text x="50" y="73" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="${borderColor}">★</text>
    </svg>
  </div>`;
};

const buildInvoiceHtml = (order, user) => {
  const seal = getStatusSeal(order.status);
  const statusSealHtml = renderCircularSeal({
    topText: 'AGRISTORE',
    centerText: seal.label,
    bottomText: 'STATUS SEAL',
    borderColor: seal.border,
    centerColor: seal.color
  });
  const officialSealHtml = renderCircularSeal({
    topText: 'AGRISTORE',
    centerText: 'VERIFIED',
    bottomText: 'OFFICIAL SEAL',
    borderColor: '#0f172a',
    centerColor: '#0f172a'
  });
  const orderCode = order._id.toString().slice(-8).toUpperCase();
  const itemsRows = (order.items || []).map((item, idx) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111827;">${idx + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;">${item.name || '-'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#475569;text-align:center;">${item.quantity || 0}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#475569;text-align:right;">${formatCurrency(item.price)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;text-align:right;font-weight:700;">${formatCurrency(item.subtotal || (item.quantity || 0) * (item.price || 0))}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>AgriStore Invoice #${orderCode}</title>
</head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;">
  <div style="max-width:980px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="background:#0f172a;padding:22px 24px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div>
        <p style="margin:0;color:#10b981;font-size:30px;font-weight:900;letter-spacing:-0.4px;">AgriStore</p>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;letter-spacing:1.6px;">PREMIUM QUALITY</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:1.6px;">AGRISTORE SEAL</p>
        <div style="margin-top:6px;">${officialSealHtml}</div>
      </div>
    </div>

    <div style="padding:22px 24px 8px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div>
        <p style="margin:0;font-size:11px;letter-spacing:1.8px;color:#94a3b8;font-weight:800;">INVOICE</p>
        <p style="margin:6px 0 0;font-size:30px;font-weight:900;color:#0f172a;">#${orderCode}</p>
      </div>
      <div style="text-align:right;">
        ${statusSealHtml}
        <p style="margin:10px 0 0;color:#64748b;font-size:13px;">Order Date: <strong style="color:#0f172a;">${formatDate(order.orderDate || order.createdAt)}</strong></p>
      </div>
    </div>

    <div style="padding:16px 24px 6px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;">
        <p style="margin:0;font-size:11px;letter-spacing:1.4px;color:#94a3b8;font-weight:800;">BILLED TO</p>
        <p style="margin:8px 0 0;color:#0f172a;font-weight:800;">${user?.name || order.userId?.name || 'Customer'}</p>
        <p style="margin:4px 0 0;color:#475569;font-size:13px;">${user?.email || order.userId?.email || '-'}</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;">
        <p style="margin:0;font-size:11px;letter-spacing:1.4px;color:#94a3b8;font-weight:800;">SHIPPING ADDRESS</p>
        <p style="margin:8px 0 0;color:#0f172a;font-weight:800;">${order.shippingAddress?.name || '-'}</p>
        <p style="margin:4px 0 0;color:#475569;font-size:13px;line-height:1.5;">
          ${order.shippingAddress?.street || '-'}<br/>
          ${order.shippingAddress?.city || '-'}, ${order.shippingAddress?.state || '-'} - ${order.shippingAddress?.pincode || '-'}<br/>
          Phone: ${order.shippingAddress?.phone || '-'}
        </p>
      </div>
    </div>

    <div style="padding:16px 24px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;">#</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;">Product</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;">Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </div>

    <div style="padding:6px 24px 24px;display:flex;justify-content:flex-end;">
      <div style="width:340px;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;color:#475569;font-size:14px;"><span>Subtotal</span><strong>${formatCurrency(order.totalAmount)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;color:#475569;font-size:14px;"><span>Delivery</span><strong style="color:#059669;">FREE</strong></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0 4px;margin-top:6px;border-top:1px solid #e2e8f0;color:#0f172a;font-size:24px;font-weight:900;"><span>Total</span><span>${formatCurrency(order.totalAmount)}</span></div>
      </div>
    </div>

    <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <p style="margin:0;font-size:12px;color:#64748b;">Generated by AgriStore invoice service.</p>
      ${officialSealHtml}
    </div>
  </div>
</body>
</html>`;
};

export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }
    if (!shippingAddress) {
      return res.status(400).json({ message: 'Shipping address is required' });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `Product not found: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}`
        });
      }
      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;
      orderItems.push({
        productId: product._id,
        name: product.name,
        manufacturer: product.manufacturer,
        price: product.price,
        quantity: item.quantity,
        subtotal
      });
      await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } });
    }

    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      notes
    });

    // Non-blocking email
    sendOrderConfirmationEmail(order, req.user).catch(err =>
      console.error('Order email error:', err.message)
    );

    res.status(201).json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .select('items totalAmount status paymentMethod paymentStatus refundStatus orderDate createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderOwnerId = order.userId?._id?.toString() || order.userId?.toString();
    if (orderOwnerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const html = buildInvoiceHtml(order, order.userId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id).populate('userId', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const orderOwnerId = order.userId?._id?.toString() || order.userId?.toString();
    if (orderOwnerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order that is already ${order.status}` });
    }

    // Restore stock
    for (const item of order.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
      }
    }

    order.status = 'cancelled';

    const mailUser = {
      name: order.userId?.name || req.user.name,
      email: order.userId?.email || req.user.email
    };

    // Initiate return request for paid online orders
    if (order.paymentStatus === 'paid' && order.paymentMethod !== 'COD') {
      const returnItems = order.items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        reason: 'Order Cancelled'
      }));

      await ReturnRequest.create({
        orderId: order._id,
        userId: order.userId?._id || req.user._id,
        items: returnItems,
        reason: reason || 'Order cancelled by user',
        description: 'Automated return request created due to order cancellation',
        status: 'approved',
        refundStatus: 'pending'
      });

      order.refundStatus = 'pending';

      sendRefundStatusEmail(order, mailUser, order.refundStatus).catch(err =>
        console.error('Refund status email error:', err.message)
      );
    }

    await order.save();

    sendOrderStatusEmail(order, mailUser, 'cancelled').catch(err =>
      console.error('Cancel status email error:', err.message)
    );

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) filter.orderDate.$gte = new Date(startDate);
      if (endDate) filter.orderDate.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id).populate('userId', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const prevStatus = order.status;
    order.status = status;

    if (status === 'delivered' && !order.deliveryDate) {
      order.deliveryDate = new Date();
    }

    if (status === 'cancelled' && prevStatus !== 'cancelled') {
      // Restore stock
      for (const item of order.items) {
        if (item.productId) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        }
      }

      // Initiate return request if paid online
      if (order.paymentStatus === 'paid' && order.paymentMethod !== 'COD') {
        const returnItems = order.items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          reason: 'Order Cancelled by Admin'
        }));

        await ReturnRequest.create({
          orderId: order._id,
          userId: order.userId?._id || req.user._id,
          items: returnItems,
          reason: reason || 'Order cancelled by Admin',
          description: 'Automated return request created due to order cancellation by Admin',
          status: 'approved',
          refundStatus: 'pending'
        });

        order.refundStatus = 'pending';

        sendRefundStatusEmail(order, order.userId, order.refundStatus).catch(err => console.error(err));
      }
    }

    await order.save();

    if (prevStatus !== status) {
      sendOrderStatusEmail(order, order.userId, status).catch(err =>
        console.error('Order status email error:', err.message)
      );
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
