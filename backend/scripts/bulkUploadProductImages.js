import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Product from '../models/Product.js';
import fs from 'fs';
import path from 'path';

const IMAGE_DIR = path.resolve('uploads/admin-products'); // Place your images here
const PUBLIC_URL_PREFIX = '/uploads/admin-products/'; // Adjust if using CDN/static hosting

const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '');

const run = async () => {
  try {
    await connectDB();
    const products = await Product.find({ isActive: true }).select('_id name imageUrl');
    const files = fs.readdirSync(IMAGE_DIR);

    let updated = 0;
    for (const product of products) {
      const productKey = normalize(product.name);
      const match = files.find((file) => normalize(file.replace(path.extname(file), '')) === productKey);
      if (match) {
        const imageUrl = PUBLIC_URL_PREFIX + match;
        await Product.updateOne({ _id: product._id }, { $set: { imageUrl } });
        updated++;
        console.log(`Matched: ${product.name} -> ${match}`);
      } else {
        console.warn(`No image found for: ${product.name}`);
      }
    }
    console.log(`Updated ${updated} products with images.`);
  } catch (error) {
    console.error('Bulk upload failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
