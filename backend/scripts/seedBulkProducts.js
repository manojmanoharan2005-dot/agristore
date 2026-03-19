import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const TOTAL_PRODUCTS_TO_ADD = 500;
const fallbackCategories = ['Organic', 'Chemical', 'Bio-Fertilizer', 'Pesticide', 'Seeds', 'Equipment'];

const namesByCategory = {
  Organic: ['Soil Boost', 'Compost Plus', 'Bio Green', 'Eco Root Care', 'Organic Growth Mix'],
  Chemical: ['NPK Power', 'Nitro Max', 'Crop Catalyst', 'Field Growth Formula', 'Yield Booster'],
  'Bio-Fertilizer': ['Rhizo Active', 'Microbial Plus', 'Bio N-Fix', 'Root Micro Blend', 'VAM Booster'],
  Pesticide: ['Pest Guard', 'Shield Crop', 'Fungi Stop', 'Insect Control Pro', 'Plant Defense'],
  Seeds: ['Hybrid Pro Seeds', 'High Yield Seeds', 'F1 Select', 'Germinate Plus', 'Certified Seeds Pack'],
  Equipment: ['Sprayer Kit', 'Field Tool Set', 'Farm Utility Pack', 'Precision Applicator', 'Agri Hand Tool']
};

const units = ['kg', 'liter', 'bag', 'packet'];

const cropPools = [
  ['rice', 'wheat', 'maize'],
  ['cotton', 'sugarcane', 'soybean'],
  ['tomato', 'chilli', 'onion'],
  ['groundnut', 'mustard', 'sunflower'],
  ['paddy', 'vegetables', 'fruits'],
  ['all crops', 'horticulture', 'nursery']
];

const toTitle = (value = '') => value.replace(/\s+/g, ' ').trim();

const buildProduct = (category, index) => {
  const names = namesByCategory[category] || ['Agri Product'];
  const baseName = names[index % names.length];
  const code = String(index + 1).padStart(3, '0');
  const priceBase = 120 + (index % 25) * 35;
  const price = category === 'Equipment' ? priceBase * 4 : priceBase;
  const mrp = Math.round(price * 1.18);
  const stock = 20 + (index % 90);
  const cropTags = cropPools[index % cropPools.length];

  return {
    name: toTitle(`${baseName} ${category} ${code}`),
    description: `${category} product batch ${code}. Designed for stable crop performance, easy use, and reliable field results.`,
    category,
    cropTags,
    price,
    mrp,
    unit: units[index % units.length],
    stock,
    imageUrl: `https://picsum.photos/seed/agristore-${category.replace(/\s+/g, '-').toLowerCase()}-${code}/600/600`,
    manufacturer: 'AgriStore Labs',
    composition: `${category} formulation blend`,
    usage: 'Use as per crop stage and dosage guidance.',
    benefits: ['Improves crop support', 'Easy to apply', 'Suitable for farm use'],
    safetyPrecautions: ['Store in cool dry place', 'Keep away from children'],
    isActive: true,
    isTrending: index % 8 === 0,
    isFlashSale: index % 11 === 0,
    rating: Number((3.8 + (index % 12) * 0.1).toFixed(1)),
    reviewCount: 5 + (index % 300)
  };
};

const run = async () => {
  try {
    await connectDB();

    const categoriesFromDb = await Category.find({ isActive: true }).select('name').lean();
    const categoryNames = categoriesFromDb.length
      ? categoriesFromDb.map((c) => c.name)
      : fallbackCategories;

    const productsToInsert = [];
    for (let i = 0; i < TOTAL_PRODUCTS_TO_ADD; i += 1) {
      const category = categoryNames[i % categoryNames.length];
      productsToInsert.push(buildProduct(category, i));
    }

    const result = await Product.insertMany(productsToInsert, { ordered: false });
    console.log(`Added ${result.length} products successfully across ${categoryNames.length} categories.`);
  } catch (error) {
    console.error('Bulk seed failed:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
