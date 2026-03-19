/**
 * processLegacyRefunds.js
 * Processes orders that were cancelled but whose refunds failed or are stuck in pending.
 * Run manually: node scripts/processLegacyRefunds.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { getRazorpayInstance } from '../utils/razorpay.js';

const processLegacyRefunds = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const razorpay = getRazorpayInstance();
  if (!razorpay) {
    console.error('Razorpay keys not configured — cannot process refunds');
    process.exit(1);
  }

  // Find cancelled paid online orders with unprocessed/failed refunds
  const orders = await Order.find({
    status: 'cancelled',
    paymentStatus: 'paid',
    paymentMethod: { $ne: 'COD' },
    refundStatus: { $in: ['pending', 'failed'] },
    'paymentDetails.razorpay_payment_id': { $exists: true }
  }).populate('userId', 'name email');

  console.log(`Found ${orders.length} orders to process refunds for`);

  let processed = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      console.log(`Processing refund for order: ${order._id} (₹${order.totalAmount})`);

      const refund = await razorpay.payments.refund(
        order.paymentDetails.razorpay_payment_id,
        { amount: Math.round(order.totalAmount * 100) }
      );

      order.paymentDetails.razorpay_refund_id = refund.id;
      order.refundStatus = 'processed';
      await order.save();

      console.log(`✅ Refund processed: ${refund.id} for order ${order._id}`);
      processed++;
    } catch (err) {
      console.error(`❌ Failed to refund order ${order._id}: ${err.message}`);
      order.refundStatus = 'failed';
      await order.save();
      failed++;
    }
  }

  console.log(`\nSummary: ${processed} processed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(0);
};

processLegacyRefunds().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
