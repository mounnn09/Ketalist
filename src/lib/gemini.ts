import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Gemini client
// Note: You must add VITE_GEMINI_API_KEY to your .env file
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
