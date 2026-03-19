import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Product from '../models/Product.js';

const categoryQueries = {
  Organic: [
    'organic fertilizer bag',
    'compost fertilizer',
    'bio organic manure',
    'soil amendment agriculture'
  ],
  Chemical: [
    'chemical fertilizer bag',
    'npk fertilizer granules',
    'urea fertilizer sack',
    'agro fertilizer product'
  ],
  'Bio-Fertilizer': [
    'biofertilizer agriculture',
    'microbial fertilizer product',
    'organic bio enhancer farming',
    'agriculture nutrient inoculant'
  ],
  Pesticide: [
    'pesticide bottle agriculture',
    'crop protection spray bottle',
    'farm insecticide product',
    'fungicide agriculture pack'
  ],
  Seeds: [
    'seed packet agriculture',
    'hybrid seeds package',
    'crop seeds bag',
    'vegetable seeds pack'
  ],
  Equipment: [
    'agriculture sprayer machine',
    'farm hand tools',
    'knapsack sprayer agriculture',
    'agricultural equipment tools'
  ]
};

const keywordOverrides = [
  { test: /sprayer|spray/i, query: 'knapsack sprayer agriculture' },
  { test: /seed|hybrid|paddy|tomato|cotton/i, query: 'seed packet agriculture' },
  { test: /fungicide|insecticide|pesticide|chlorpyrifos|mancozeb|imidacloprid/i, query: 'pesticide bottle agriculture' },
  { test: /urea|dap|npk|fertilizer|vermicompost|bone meal/i, query: 'fertilizer bag agriculture' },
  { test: /tool|equipment|utility/i, query: 'farm equipment tools' }
];

const toUnsplashSource = (query, seedValue) => {
  const encoded = encodeURIComponent(query);
  return `https://source.unsplash.com/900x900/?${encoded}&sig=${seedValue}`;
};

const pickQuery = (product, index) => {
  const name = product.name || '';

  const override = keywordOverrides.find((entry) => entry.test.test(name));
  if (override) return override.query;

  const category = product.category || 'Organic';
  const pool = categoryQueries[category] || categoryQueries.Organic;
  return pool[index % pool.length];
};

const buildImageUrl = (product, index) => {
  const query = pickQuery(product, index);
  // sig ensures deterministic variation so products don't all share one photo.
  return toUnsplashSource(query, index + 1);
};

const run = async () => {
  try {
    await connectDB();

    const products = await Product.find({ isActive: true }).sort({ _id: 1 }).select('_id name category imageUrl');

    if (!products.length) {
      console.log('No active products found.');
      return;
    }

    const updates = products.map((product, index) => ({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { imageUrl: buildImageUrl(product, index) } }
      }
    }));

    await Product.bulkWrite(updates, { ordered: false });

    console.log(`Assigned images for ${products.length} products.`);
  } catch (error) {
    console.error('Image assignment failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
