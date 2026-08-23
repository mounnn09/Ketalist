import { genAI } from './gemini';

export async function summarizeText(text: string, type: 'youtube' | 'pdf'): Promise<string> {
  if (!genAI) throw new Error("Gemini not initialized.");
  
  // Use gemini-flash-latest for speed and large context windows
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  
  const prompt = type === 'youtube'
    ? `You are an expert academic summarizer. Below is a raw transcript extracted from a YouTube video. 
Please provide a comprehensive, structured summary of the video. 
Use clean markdown with H2/H3 headings, bullet points, and bold text for key terms. 
Make it highly readable and ensure you capture all key concepts and facts.

--- Transcript ---
${text}`
    : `You are an expert academic summarizer. Below is the raw text extracted from a PDF document. 
Please provide a comprehensive, structured summary of the document. 
Use clean markdown with H2/H3 headings, bullet points, and bold text for key terms. 
Make it highly readable and ensure you capture all key concepts and facts.

--- PDF Text ---
${text}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
