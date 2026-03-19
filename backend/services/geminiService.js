import { GoogleGenerativeAI } from '@google/generative-ai';

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel(
    { model: 'gemma-3-4b-it' },
    { apiVersion: 'v1beta' }
  );
};

const extractJSON = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error('No JSON object found in response');
};

const extractArray = (text) => {
  const match = text.match(/\[[\s\S]*\]/);
  if (match) return JSON.parse(match[0]);
  throw new Error('No JSON array found in response');
};

export const getProductAdvice = async (product, cropType, soilType, season) => {
  try {
    const model = getModel();
    const hasFarmerContext = cropType || soilType || season;
    const prompt = `You are an expert agricultural advisor in India.
Analyze the selected product and provide product-specific properties and practical usage advice.

Product: ${product.name}
Category: ${product.category}
Description: ${product.description}
Composition: ${product.composition || 'N/A'}
NPK Ratio: N-${product.npkRatio?.nitrogen || 0}, P-${product.npkRatio?.phosphorus || 0}, K-${product.npkRatio?.potassium || 0}

Farmer's Context (optional):
Crop Type: ${cropType}
Soil Type: ${soilType}
Season: ${season}

Respond ONLY with a valid JSON object (no markdown):
{
  "productName": "${product.name}",
  "category": "${product.category}",
  "keyProperties": ["property 1", "property 2", "property 3"],
  "recommendedUseCases": ["use case 1", "use case 2", "use case 3"],
  "suitability": "high|medium|low",
  "suitabilityReason": "one sentence explanation",
  "dosage": "specific dosage recommendation",
  "applicationMethod": "how to apply this product",
  "bestTime": "best time to apply",
  "safetyPrecautions": ["precaution1", "precaution2", "precaution3"]
}

If farmer context is missing, still provide accurate product-level properties and general-use advice.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return extractJSON(text);
  } catch (error) {
    console.error('getProductAdvice error:', error.message);
    return {
      productName: product.name,
      category: product.category,
      keyProperties: [
        product.composition || 'Refer product label for composition details',
        product.npkRatio ? `NPK: ${product.npkRatio.nitrogen}-${product.npkRatio.phosphorus}-${product.npkRatio.potassium}` : 'Balanced nutrient support',
        'Suitable for routine farm application with correct dosage'
      ],
      recommendedUseCases: [
        hasFarmerContext ? `Use for ${cropType || 'crop'} in ${season || 'current'} season` : 'General soil nutrient support',
        'Improve crop vigor and growth consistency',
        'Use in planned farm nutrition schedules'
      ],
      suitability: 'medium',
      suitabilityReason: 'Please consult a local agricultural expert for personalized advice.',
      dosage: 'Follow manufacturer label instructions carefully.',
      applicationMethod: 'As per manufacturer guidelines and local agricultural officer advice.',
      bestTime: 'Early morning or late evening for best results.',
      safetyPrecautions: [
        'Wear protective gloves and mask during application',
        'Keep away from children and animals',
        'Store in cool, dry place away from direct sunlight',
        'Wash hands thoroughly after use'
      ]
    };
  }
};

export const getPriceIntelligence = async (name, price, category) => {
  try {
    const model = getModel();
    const prompt = `You are an agricultural market analyst specializing in Indian farming markets.
Analyze the price trend for this product.

Product: ${name}
Category: ${category}
Current Price: ₹${price}

Respond ONLY with a valid JSON object (no markdown):
{
  "trend": "rising|stable|falling",
  "trendPercentage": 5,
  "buyingAdvice": "buy now|wait|stock up",
  "reason": "brief market insight in one sentence",
  "bestSeason": "Kharif|Rabi|Zaid|Year-round"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return extractJSON(text);
  } catch (error) {
    console.error('getPriceIntelligence error:', error.message);
    return {
      trend: 'stable',
      trendPercentage: 0,
      buyingAdvice: 'buy now',
      reason: 'Market data temporarily unavailable. Prices appear stable.',
      bestSeason: 'Year-round'
    };
  }
};

export const enhanceSearchQuery = async (query) => {
  try {
    const model = getModel();
    const prompt = `You are a search assistant for an Indian agricultural e-commerce store selling fertilizers, pesticides, seeds, and farming equipment.

Convert this natural language search query into specific product search keywords for a MongoDB text search.
Query: "${query}"

Respond ONLY with a valid JSON array of 3-6 relevant keywords (no markdown):
["keyword1", "keyword2", "keyword3"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return extractArray(text);
  } catch (error) {
    console.error('enhanceSearchQuery error:', error.message);
    return query.split(' ').filter(w => w.length > 2);
  }
};

export const getChatResponse = async (history, message) => {
  try {
    const model = getModel();
    const systemPrompt = `You are AgriSmart AI — a helpful field assistant for Indian farmers on the AgriStore platform.
You specialize in fertilizers, pesticides, seeds, irrigation, crop diseases, soil health, and farming equipment.
Give practical, specific advice relevant to Indian farming conditions and seasons (Kharif, Rabi, Zaid).
Keep responses concise, friendly, and use simple language. Format with bullet points when listing steps.`;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Namaste! I am AgriSmart AI, your agricultural field assistant. I can help you with fertilizers, crop diseases, soil health, and farming advice. How can I help you today?' }] },
        ...history
      ]
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.error('getChatResponse error:', error.message);
    return 'I apologize, I am temporarily unavailable. Please try again in a moment, or consult your local agricultural officer for immediate assistance.';
  }
};
