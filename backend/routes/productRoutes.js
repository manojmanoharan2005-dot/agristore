import express from 'express';
import {
  getProducts,
  searchProducts,
  getAIPriceSuggestions,
  applyPrices,
  getProduct,
  getProductAdvice,
  getPriceIntelligence,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Static routes must come before /:id
router.get('/search', searchProducts);
router.get('/admin/ai-price-suggestions', protect, adminOnly, getAIPriceSuggestions);
router.post('/admin/apply-prices', protect, adminOnly, applyPrices);

router.get('/', getProducts);
router.post('/', protect, adminOnly, createProduct);

// Dynamic routes with :id
router.get('/:id', getProduct);
router.post('/:id/advice', getProductAdvice);
router.get('/:id/price-intelligence', getPriceIntelligence);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

export default router;
