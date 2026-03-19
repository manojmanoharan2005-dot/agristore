import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrder,
  getOrderInvoice,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
} from '../controllers/orderController.js';
import { protect, adminOnly, farmerOnly } from '../middleware/auth.js';

const router = express.Router();

// Static routes before /:id
router.get('/my-orders', protect, getMyOrders);
router.get('/', protect, adminOnly, getAllOrders);
router.post('/', protect, farmerOnly, createOrder);

// Dynamic routes
router.get('/:id/invoice', protect, getOrderInvoice);
router.get('/:id', protect, getOrder);
router.patch('/:id/cancel', protect, cancelOrder);
router.patch('/:id/status', protect, adminOnly, updateOrderStatus);

export default router;
