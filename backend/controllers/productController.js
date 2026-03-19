import Product from '../models/Product.js';
import {
  getProductAdvice as aiGetProductAdvice,
  getPriceIntelligence as aiGetPriceIntelligence,
  enhanceSearchQuery
} from '../services/geminiService.js';

export const getProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, inStock, trending, flashSale, sort } = req.query;

    const query = { isActive: true };

    if (category) query.category = category;
    if (inStock === 'true') query.stock = { $gt: 0 };
    if (trending === 'true') query.isTrending = true;
    if (flashSale === 'true') query.isFlashSale = true;
    if (search) query.$text = { $search: search };

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let sortObj = {};
    if (sort === 'price_asc') sortObj.price = 1;
    else if (sort === 'price_desc') sortObj.price = -1;
    else if (sort === 'newest') sortObj.createdAt = -1;
    else sortObj.rating = -1;

    const products = await Product.find(query).sort(sortObj);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const keywords = await enhanceSearchQuery(query);
    const searchString = keywords.join(' ');

    const products = await Product.find(
      { isActive: true, $text: { $search: searchString } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });

    res.json({ products, keywords });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductAdvice = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const { cropType = '', soilType = '', season = '' } = req.body || {};
    const advice = await aiGetProductAdvice(product, cropType, soilType, season);
    res.json({ advice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPriceIntelligence = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('name price category');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const intelligence = await aiGetPriceIntelligence(product.name, product.price, product.category);
    res.json({ intelligence });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAIPriceSuggestions = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).select('name price category');

    const suggestions = await Promise.all(
      products.map(async (p) => {
        const intel = await aiGetPriceIntelligence(p.name, p.price, p.category);
        let suggestedPrice = p.price;
        const pct = intel.trendPercentage || 5;
        if (intel.trend === 'rising') {
          suggestedPrice = Math.round(p.price * (1 + pct / 100));
        } else if (intel.trend === 'falling') {
          suggestedPrice = Math.round(p.price * (1 - pct / 100));
        }
        return {
          productId: p._id,
          name: p.name,
          category: p.category,
          currentPrice: p.price,
          suggestedPrice,
          trend: intel.trend,
          trendPercentage: intel.trendPercentage,
          buyingAdvice: intel.buyingAdvice,
          reason: intel.reason
        };
      })
    );

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const applyPrices = async (req, res) => {
  try {
    const { prices } = req.body; // [{ productId, newPrice }]
    if (!Array.isArray(prices) || prices.length === 0) {
      return res.status(400).json({ message: 'prices array is required' });
    }

    await Promise.all(
      prices.map(({ productId, newPrice }) =>
        Product.findByIdAndUpdate(productId, { price: Number(newPrice) })
      )
    );

    res.json({ message: `Updated prices for ${prices.length} products` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
