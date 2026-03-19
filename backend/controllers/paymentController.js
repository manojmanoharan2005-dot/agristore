import crypto from 'crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { getRazorpayInstance } from '../utils/razorpay.js';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from '../services/mailService.js';

export const createRazorpayOrder = async (req, res) => {
  try {
    const razorpay = getRazorpayInstance();
    const keyId = process.env.RAZORPAY_KEY_ID?.replace(/"/g, '');
    if (!razorpay) {
      return res.status(503).json({ message: 'Payment service is currently unavailable' });
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const shortReceipt = `rcpt_${Date.now()}_${String(req.user._id).slice(-8)}`;

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: 'INR',
      receipt: shortReceipt.slice(0, 40)
    };

    const order = await razorpay.orders.create(options);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId
    });
  } catch (error) {
    console.error('Razorpay create order error:', error);
    const message = error?.error?.description || error?.description || error?.message || 'Razorpay order creation failed';
    res.status(500).json({ message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      shippingAddress,
      notes
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Payment details are incomplete' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET?.replace(/"/g, '');
    if (!keySecret) {
      return res.status(503).json({ message: 'Payment verification unavailable. Missing Razorpay secret.' });
    }
    const signaturePayload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(signaturePayload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed: invalid signature' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
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
          message: `Insufficient stock for \"${product.name}\". Available: ${product.stock}`
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
      paymentMethod: 'Online',
      paymentStatus: 'paid',
      status: 'confirmed',
      paymentDetails: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      },
      notes
    });

    sendOrderConfirmationEmail(order, req.user).catch(err =>
      console.error('Payment order email error:', err.message)
    );
    sendOrderStatusEmail(order, req.user, 'processing').catch(err =>
      console.error('Payment processing email error:', err.message)
    );

    res.status(201).json({ order });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    const message = error?.error?.description || error?.description || error?.message || 'Payment verification failed';
    res.status(500).json({ message });
  }
};
