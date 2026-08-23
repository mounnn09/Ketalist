import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.VITE_GEMINI_API_KEY;
console.log("API Key present:", !!apiKey);

async function run() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).map(m => m.name));
  } catch (e) {
    console.error("List error:", e.message);
  }
}
run();
