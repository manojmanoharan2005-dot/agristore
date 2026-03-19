import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import ReturnRequest from '../models/ReturnRequest.js';
import { sendOrderStatusEmail, sendRefundStatusEmail } from '../services/mailService.js';
import Razorpay from 'razorpay';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const RETURN_DECISIONS = ['approved', 'rejected'];
const REFUND_STATUSES = ['pending', 'processed', 'failed'];

const parsePagination = (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const toDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return null;
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
};

const toRegex = (value = '') => new RegExp(value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const ensureCategoryExists = async (name) => {
  const cleanName = String(name || '').trim();
  if (!cleanName) return;
  await Category.findOneAndUpdate(
    { name: cleanName },
    { $setOnInsert: { name: cleanName, description: '', isActive: true } },
    { upsert: true, new: true }
  );
};

export const uploadAdminProductImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image file is required' });

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/admin-products/${req.file.filename}`;
    return res.status(201).json({ imageUrl, filename: req.file.filename });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOverview = async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, revenueData, recentOrders] = await Promise.all([
      User.countDocuments({ role: 'farmer' }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ]),
      Order.find()
        .select('totalAmount status paymentStatus createdAt userId items')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    return res.json({
      stats: { totalUsers, totalProducts, totalOrders, totalRevenue },
      recentOrders
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAdminProducts = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search = '', category = '', stockStatus = '' } = req.query;

    const filter = {};
    if (search.trim()) {
      const regex = toRegex(search);
      filter.$or = [{ name: regex }, { description: regex }, { manufacturer: regex }];
    }
    if (category.trim()) filter.category = category.trim();
    if (stockStatus === 'in') filter.stock = { $gt: 0 };
    if (stockStatus === 'out') filter.stock = { $lte: 0 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    return res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createAdminProduct = async (req, res) => {
  try {
    const { name, description, category, price, imageUrl, stock } = req.body;

    if (!name || !description || !category || price === undefined || stock === undefined) {
      return res.status(400).json({ message: 'name, description, category, price and stock are required' });
    }

    const product = await Product.create({
      name: String(name).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      price: Number(price),
      stock: Number(stock),
      imageUrl: imageUrl?.trim() || undefined
    });

    await ensureCategoryExists(product.category);

    return res.status(201).json({ product });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateAdminProduct = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.name !== undefined) updates.name = String(updates.name).trim();
    if (updates.description !== undefined) updates.description = String(updates.description).trim();
    if (updates.category !== undefined) updates.category = String(updates.category).trim();
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (updates.category) {
      await ensureCategoryExists(updates.category);
    }

    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteAdminProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.json({ message: 'Product deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAdminOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status = '', paymentStatus = '', startDate = '', endDate = '', search = '' } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const dateRange = toDateRange(startDate, endDate);
    if (dateRange) filter.orderDate = dateRange;

    if (search.trim()) {
      const regex = toRegex(search);
      const userIds = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').lean();
      const ids = userIds.map((u) => u._id);

      const searchOr = [{ _id: mongoose.Types.ObjectId.isValid(search.trim()) ? new mongoose.Types.ObjectId(search.trim()) : null }].filter(Boolean);
      if (ids.length) searchOr.push({ userId: { $in: ids } });
      searchOr.push({ 'items.name': regex });

      filter.$or = searchOr;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter)
    ]);

    return res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAdminOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone address')
      .populate('items.productId', 'name category stock')
      .lean();

    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.json({ order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateAdminOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id).populate('userId', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const prevStatus = order.status;
    order.status = status;
    if (status === 'delivered' && !order.deliveryDate) order.deliveryDate = new Date();
    await order.save();

    if (prevStatus !== status) {
      sendOrderStatusEmail(order, order.userId, status).catch((err) => {
        console.error('Order status email error:', err.message);
      });
    }

    return res.json({ order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search = '', blocked = '' } = req.query;

    const filter = { role: { $ne: 'admin' } };
    if (search.trim()) {
      const regex = toRegex(search);
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }
    if (blocked === 'true') filter.isBlocked = true;
    if (blocked === 'false') filter.isBlocked = false;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email phone isBlocked role createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    return res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const setUserBlockStatus = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ message: 'isBlocked must be boolean' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin users cannot be blocked' });
    }

    user.isBlocked = isBlocked;
    await user.save();

    return res.json({ user: { _id: user._id, isBlocked: user.isBlocked } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin users cannot be deleted' });
    }

    await User.deleteOne({ _id: user._id });
    return res.json({ message: 'User deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    let categories = await Category.find().sort({ createdAt: -1 }).lean();

    // Bootstrap categories from existing product data if collection is empty.
    if (!categories.length) {
      const distinctProductCategories = await Product.distinct('category', { category: { $exists: true, $ne: '' } });
      if (distinctProductCategories.length) {
        await Category.insertMany(
          distinctProductCategories.map((name) => ({ name: String(name).trim() })),
          { ordered: false }
        ).catch(() => null);
        categories = await Category.find().sort({ createdAt: -1 }).lean();
      }
    }

    return res.json({ categories });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Category name is required' });

    const exists = await Category.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ message: 'Category already exists' });

    const category = await Category.create({ name: name.trim(), description: description?.trim() || '' });
    return res.status(201).json({ category });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);

    const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    return res.json({ category });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    return res.json({ message: 'Category deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getReturnRequests = async (req, res) => {
  try {
    const { status = '', refundStatus = '' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (refundStatus) filter.refundStatus = refundStatus;

    const requests = await ReturnRequest.find(filter)
      .populate('userId', 'name email')
      .populate('orderId', 'totalAmount paymentMethod paymentStatus status')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createReturnRequest = async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const cleanOrderId = orderId.toString().replace('#', '').trim();
    let order = null;

    if (mongoose.Types.ObjectId.isValid(cleanOrderId)) {
      order = await Order.findById(cleanOrderId).populate('userId', 'name email');
    } else {
      order = await Order.findOne({
        $expr: {
          $regexMatch: {
            input: { $toString: '$_id' },
            regex: new RegExp(`${cleanOrderId}$`, 'i')
          }
        }
      }).populate('userId', 'name email');
    }

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const request = await ReturnRequest.create({
      orderId: order._id,
      userId: order.userId._id,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        reason: reason || 'Requested from admin panel'
      })),
      reason: reason || 'Return requested by admin',
      description: description || ''
    });

    return res.status(201).json({ request });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const decideReturnRequest = async (req, res) => {
  try {
    const { decision, adminNote } = req.body;
    if (!RETURN_DECISIONS.includes(decision)) {
      return res.status(400).json({ message: 'decision must be approved or rejected' });
    }

    const request = await ReturnRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Return request not found' });

    request.status = decision;
    request.adminNote = adminNote?.trim() || '';
    request.resolvedAt = new Date();
    request.refundStatus = decision === 'approved' ? 'pending' : 'none';
    await request.save();

    return res.json({ request });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const processRefund = async (req, res) => {
  try {
    const { refundStatus, refundReference } = req.body;
    if (!REFUND_STATUSES.includes(refundStatus)) {
      return res.status(400).json({ message: 'Invalid refundStatus' });
    }

    const request = await ReturnRequest.findById(req.params.id).populate('orderId').populate('userId', 'name email');
    if (!request) return res.status(404).json({ message: 'Return request not found' });
    if (request.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved returns can be refunded' });
    }

    let actualRefundReference = refundReference?.trim() || '';

    if (refundStatus === 'processed' && request.orderId && request.orderId.paymentDetails?.razorpay_payment_id) {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        try {
          const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
          });

          const refund = await instance.payments.refund(request.orderId.paymentDetails.razorpay_payment_id, {
            amount: request.orderId.totalAmount * 100,
            notes: { returnRequestId: request._id.toString() }
          });

          actualRefundReference = refund.id;
        } catch (rpError) {
          console.error('Razorpay Refund Error:', rpError);
          return res.status(400).json({ message: `Razorpay Refund Failed: ${rpError.error?.description || rpError.message}` });
        }
      }
    }

    request.refundStatus = refundStatus;
    request.refundReference = actualRefundReference;
    await request.save();

    if (request.orderId) {
      request.orderId.refundStatus = refundStatus;
      if (actualRefundReference) {
        request.orderId.paymentDetails = { 
          ...request.orderId.paymentDetails, 
          razorpay_refund_id: actualRefundReference 
        };
      }
      await request.orderId.save();

      if (request.userId?.email) {
         sendRefundStatusEmail(request.orderId, request.userId, refundStatus).catch(err => console.error(err));
      }
    }

    return res.json({ request });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getSalesAnalytics = async (req, res) => {
  try {
    const range = String(req.query.range || 'daily').toLowerCase();
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);

    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    let dateFormat = '%Y-%m-%d';
    if (range === 'weekly') dateFormat = '%G-W%V';
    if (range === 'monthly') dateFormat = '%Y-%m';

    const sales = await Order.aggregate([
      { $match: { createdAt: { $gte: start }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.json({ sales, range, days });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTopSellingProducts = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);

    const topProducts = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: limit }
    ]);

    return res.json({ topProducts });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
