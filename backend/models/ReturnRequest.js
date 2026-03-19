import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, trim: true },
  quantity: { type: Number, min: 1, default: 1 },
  reason: { type: String, trim: true }
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [returnItemSchema],
  reason: { type: String, trim: true },
  description: { type: String, trim: true },
  status: {
    type: String,
    enum: ['requested', 'approved', 'rejected'],
    default: 'requested'
  },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'processed', 'failed'],
    default: 'none'
  },
  adminNote: { type: String, trim: true },
  refundReference: { type: String, trim: true },
  requestedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
}, { timestamps: true });

returnRequestSchema.index({ status: 1, createdAt: -1 });
returnRequestSchema.index({ userId: 1, createdAt: -1 });
returnRequestSchema.index({ orderId: 1 });

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);
export default ReturnRequest;
