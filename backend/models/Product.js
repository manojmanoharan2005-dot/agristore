import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Product name is required'], trim: true },
  description: { type: String, required: [true, 'Description is required'] },
  category: { type: String, required: [true, 'Category is required'], trim: true },
  cropTags: [{ type: String, lowercase: true, trim: true }],
  price: { type: Number, required: [true, 'Price is required'], min: 0 },
  mrp: { type: Number, min: 0 },
  isTrending: { type: Boolean, default: false },
  isFlashSale: { type: Boolean, default: false },
  unit: {
    type: String,
    enum: ['kg', 'liter', 'bag', 'packet'],
    default: 'kg'
  },
  stock: { type: Number, required: [true, 'Stock is required'], min: 0, default: 0 },
  imageUrl: { type: String, default: '/images/default-fertilizer.jpg' },
  manufacturer: { type: String, trim: true },
  npkRatio: {
    nitrogen: { type: Number },
    phosphorus: { type: Number },
    potassium: { type: Number }
  },
  composition: { type: String },
  usage: { type: String },
  benefits: [{ type: String }],
  safetyPrecautions: [{ type: String }],
  isActive: { type: Boolean, default: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', cropTags: 'text' });
productSchema.index({ category: 1, stock: 1, createdAt: -1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
