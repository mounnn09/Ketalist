import { genAI, GEMINI_CHAT_MODEL, GEMINI_EMBED_MODEL } from './gemini';
import { supabase } from './supabase';

const YT_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

async function fetchYoutubeTranscript(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/transcript?videoId=${videoId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.transcript || null;
  } catch (err) {
    console.error("Failed to fetch youtube transcript", err);
    return null;
  }
}

function parseMockTestJson(jsonText: string) {
  let text = jsonText.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();

  const parsed = JSON.parse(text);
  const questions = Array.isArray(parsed) ? parsed : parsed?.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Failed to generate a valid test format.");
  }
  return questions;
}

export async function askTimeMachine(query: string, userId: string) {
  if (!genAI) throw new Error("Gemini not initialized");
  if (!supabase) throw new Error("Supabase not initialized");

  // 1. Embed the user's query
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;
  const embedRes = await fetch(embedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-2',
      content: { parts: [{ text: query.replace(/\n/g, ' ') }] }
    })
  });
  if (!embedRes.ok) throw new Error("Failed to embed query: " + await embedRes.text());
  const embedData = await embedRes.json();
  const query_embedding = embedData.embedding.values.slice(0, 768);

  // 2. Search for relevant chunks (empty is OK — scheduling can still work)
  const { data: rawChunks, error: rpcError } = await supabase
    .rpc('match_document_chunks', {
      query_embedding,
      match_threshold: 0.5,
      match_count: 5
    });

  if (rpcError) {
    console.error("Error fetching chunks:", rpcError);
    throw rpcError;
  }
  
  // Filter chunks to only those belonging to the current user
  let chunks = [];
  if (rawChunks && rawChunks.length > 0) {
    // If the RPC doesn't return document_id, we fallback to fetching all user doc IDs and matching titles
    const { data: userDocs } = await supabase
      .from('documents')
      .select('id, title')
      .eq('user_id', userId);
      
    if (userDocs && userDocs.length > 0) {
      const validDocIds = new Set(userDocs.map(d => d.id));
      const validDocTitles = new Set(userDocs.map(d => d.title));
      
      chunks = rawChunks.filter((c: any) => {
        if (c.document_id) return validDocIds.has(c.document_id);
        if (c.document_title) return validDocTitles.has(c.document_title);
        return false;
      });
    }
  }

  let youtubeContext = "";
  const ytMatch = query.match(YT_REGEX);
  if (ytMatch) {
    const transcript = await fetchYoutubeTranscript(ytMatch[1]);
    if (transcript) youtubeContext += `Video Transcript (from query): ${transcript}\n\n`;
  }

  for (const chunk of chunks || []) {
    if (!chunk.content) continue;
    const match = chunk.content.match(YT_REGEX);
    if (!match) continue;
    const transcript = await fetchYoutubeTranscript(match[1]);
    if (transcript) youtubeContext += `Video Transcript (${chunk.document_title}): ${transcript}\n\n`;
  }

  const hasMemories = Array.isArray(chunks) && chunks.length > 0;
  const contextText = hasMemories
    ? chunks.map((chunk: { document_title?: string; document_created_at?: string; content?: string }) =>
        `Document: ${chunk.document_title}\nAdded on: ${new Date(chunk.document_created_at || Date.now()).toLocaleDateString()}\nContent: ${chunk.content}`
      ).join("\n\n---\n\n")
    : "No matching notes were found in the user's second brain.";

  const chatModel = genAI.getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    systemInstruction: `You are Ketalist, a personal knowledge assistant.
Answer the user's question based strictly on the following context retrieved from their second brain, or the provided Video Transcript if applicable.
Do not make up facts outside of this context.
If the answer is not in the context, politely say that you don't remember learning about that yet.
Keep answers conversational, concise, and helpful.

You MAY still help with calendar scheduling even when no notes match.

AGENTIC SCHEDULING RULE:
If the user asks you to schedule, add, or remind them about a task or event on their calendar, you MUST append a JSON tag at the VERY END of your response.
The current date is ${new Date().toLocaleDateString('en-CA')}. Use this to resolve relative dates like "tomorrow" or "next Monday".
The tag format must be exactly:
[SCHEDULE_INTENT: {"title": "Task Name", "date": "YYYY-MM-DD", "time": "All Day"}]
Example: Sure, I've scheduled your biology study session! [SCHEDULE_INTENT: {"title": "Biology Study Session", "date": "2026-08-24", "time": "All Day"}]`
  });

  const prompt = `Context:\n${contextText}\n\n${youtubeContext ? youtubeContext + '\n\n' : ''}Question: ${query}`;
  const completion = await chatModel.generateContent(prompt);
  const answer = completion.response.text() || "I encountered an error generating an answer.";

  const primarySource = hasMemories ? chunks[0] : null;
  const dateStr = primarySource?.document_created_at
    ? new Date(primarySource.document_created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : undefined;

  return {
    answer,
    source: primarySource ? {
      title: primarySource.document_title,
      type: primarySource.document_type
    } : null,
    date: dateStr
  };
}

export async function generateMockTest(topic: string, userId: string, questionCount: number = 5) {
  if (!genAI) throw new Error("Gemini not initialized");
  if (!supabase) throw new Error("Supabase not initialized");

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;
  const embedRes = await fetch(embedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-2',
      content: { parts: [{ text: topic.replace(/\n/g, ' ') }] }
    })
  });
  if (!embedRes.ok) throw new Error("Failed to embed topic: " + await embedRes.text());
  const embedData = await embedRes.json();
  const query_embedding = embedData.embedding.values.slice(0, 768);

  const { data: rawChunks, error: rpcError } = await supabase
    .rpc('match_document_chunks', {
      query_embedding,
      match_threshold: 0.4,
      match_count: 8
    });

  if (rpcError) throw rpcError;
  
  let chunks = [];
  if (rawChunks && rawChunks.length > 0) {
    const { data: userDocs } = await supabase
      .from('documents')
      .select('id, title')
      .eq('user_id', userId);
      
    if (userDocs && userDocs.length > 0) {
      const validDocIds = new Set(userDocs.map(d => d.id));
      const validDocTitles = new Set(userDocs.map(d => d.title));
      
      chunks = rawChunks.filter((c: any) => {
        if (c.document_id) return validDocIds.has(c.document_id);
        if (c.document_title) return validDocTitles.has(c.document_title);
        return false;
      });
    }
  }

  if (!chunks || chunks.length === 0) {
    throw new Error("I couldn't find enough information about that topic in your second brain to generate a test!");
  }

  const contextText = chunks.map((chunk: { document_title?: string; content?: string }) =>
    `Document: ${chunk.document_title}\nContent: ${chunk.content}`
  ).join("\n\n---\n\n");

  const chatModel = genAI.getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    systemInstruction: `You are a strict teacher. Generate a ${questionCount}-question multiple choice test based ONLY on the provided context.
Your output MUST be a valid JSON array of objects, where each object has:
- "question": string
- "options": array of 4 string options
- "correctAnswerIndex": number (0-3)

Do not return any markdown wrapping like \`\`\`json. Just the raw JSON array.`,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `Context:\n${contextText}\n\nGenerate a mock test for the topic: ${topic}`;
  const completion = await chatModel.generateContent(prompt);

  try {
    return parseMockTestJson(completion.response.text());
  } catch {
    console.error("Failed to parse mock test JSON", completion.response.text());
    throw new Error("Failed to generate a valid test format.");
  }
}
