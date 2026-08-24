import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Gemini client
// Note: You must add VITE_GEMINI_API_KEY to your .env file
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// gemini-1.5-flash and gemini-2.5-flash were shut down
export const GEMINI_CHAT_MODEL = 'gemini-3.6-flash';
export const GEMINI_EMBED_MODEL = 'models/gemini-embedding-2';
