import { getChatResponse } from '../services/geminiService.js';

export const chat = async (req, res) => {
  try {
    const { history = [], message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const response = await getChatResponse(history, message.trim());
    res.json({ response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
