import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getOverview,
  uploadAdminProductImage,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  getAdminUsers,
  setUserBlockStatus,
  deleteAdminUser,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getReturnRequests,
  createReturnRequest,
  decideReturnRequest,
  processRefund,
  getSalesAnalytics,
  getTopSellingProducts
} from '../controllers/adminController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../uploads/admin-products');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

router.use(protect, adminOnly);

router.get('/overview', getOverview);
router.post('/upload-image', upload.single('image'), uploadAdminProductImage);

router.get('/products', getAdminProducts);
router.post('/products', createAdminProduct);
router.put('/products/:id', updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);

router.get('/orders', getAdminOrders);
router.get('/orders/:id', getAdminOrderById);
router.patch('/orders/:id/status', updateAdminOrderStatus);

router.get('/users', getAdminUsers);
router.patch('/users/:id/block', setUserBlockStatus);
router.delete('/users/:id', deleteAdminUser);

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/returns', getReturnRequests);
router.post('/returns', createReturnRequest);
router.patch('/returns/:id/decision', decideReturnRequest);
router.patch('/returns/:id/refund', processRefund);

router.get('/analytics/sales', getSalesAnalytics);
router.get('/analytics/top-products', getTopSellingProducts);

export default router;
