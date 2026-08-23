import { genAI } from './gemini';
import { supabase } from './supabase';

export async function askTimeMachine(query: string) {
  if (!genAI) throw new Error("Gemini not initialized");
  if (!supabase) throw new Error("Supabase not initialized");

  // 1. Embed the user's query using Gemini
  const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const embedResult = await embedModel.embedContent(query.replace(/\n/g, ' '));
  const query_embedding = embedResult.embedding.values.slice(0, 768);

  // 2. Search for the most relevant document chunks
  const { data: chunks, error: rpcError } = await supabase
    .rpc('match_document_chunks', {
      query_embedding,
      match_threshold: 0.5,
      match_count: 3
    });

  if (rpcError) {
    console.error("Error fetching chunks:", rpcError);
    throw rpcError;
  }

  if (!chunks || chunks.length === 0) {
    return {
      answer: "I couldn't find any memories related to that. Try adding some documents first!",
      source: null
    };
  }

  // Check if query or context contains a youtube URL
  let youtubeContext = "";
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  
  const ytMatch = query.match(ytRegex);
  if (ytMatch) {
    try {
      const res = await fetch(`/api/transcript?videoId=${ytMatch[1]}`);
      if (res.ok) {
        const data = await res.json();
        youtubeContext += `Video Transcript (from query): ${data.transcript}\n\n`;
      }
    } catch (e) {
      console.error("Failed to fetch youtube transcript", e);
    }
  }

  for (const chunk of chunks) {
    if (chunk.content) {
      const match = chunk.content.match(ytRegex);
      if (match) {
        try {
          const res = await fetch(`/api/transcript?videoId=${match[1]}`);
          if (res.ok) {
            const data = await res.json();
            youtubeContext += `Video Transcript (${chunk.document_title}): ${data.transcript}\n\n`;
          }
        } catch (e) {
          console.error("Failed to fetch youtube transcript from context", e);
        }
      }
    }
  }

  // 3. Prepare the context for the LLM
  const contextText = chunks.map((chunk: any) => `Document: ${chunk.document_title}\nAdded on: ${new Date(chunk.document_created_at).toLocaleDateString()}\nContent: ${chunk.content}`).join("\n\n---\n\n");

  // 4. Generate the answer using Gemini
  const chatModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: `You are Time Machine AI, a personal knowledge assistant. 
Answer the user's question based strictly on the following context retrieved from their second brain, or the provided Video Transcript if applicable.
Do not make up facts outside of this context.
If the answer is not in the context, politely say that you don't remember learning about that yet.
Keep answers conversational, concise, and helpful.

AGENTIC SCHEDULING RULE:
If the user asks you to schedule, add, or remind them about a task or event on their calendar, you MUST append a JSON tag at the VERY END of your response.
The current date is ${new Date().toLocaleDateString('en-CA')}. Use this to resolve relative dates like "tomorrow" or "next Monday".
The tag format must be exactly:
[SCHEDULE_INTENT: {"title": "Task Name", "date": "YYYY-MM-DD"}]
Example: Sure, I've scheduled your biology study session! [SCHEDULE_INTENT: {"title": "Biology Study Session", "date": "2026-08-24"}]`
  });

  const prompt = `Context:\n${contextText}\n\n${youtubeContext ? youtubeContext + '\n\n' : ''}Question: ${query}`;
  const completion = await chatModel.generateContent(prompt);
  const answer = completion.response.text() || "I encountered an error generating an answer.";
  
  // 5. Return the answer and the primary source
  const primarySource = chunks[0];
  
  // Format relative time (e.g. "2 days ago") for a nice touch
  const dateStr = new Date(primarySource.document_created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return {
    answer,
    source: {
      title: primarySource.document_title,
      type: primarySource.document_type
    },
    date: dateStr
  };
}

export async function generateMockTest(topic: string, questionCount: number = 5) {
  if (!genAI) throw new Error("Gemini not initialized");
  if (!supabase) throw new Error("Supabase not initialized");

  const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const embedResult = await embedModel.embedContent(topic.replace(/\n/g, ' '));
  const query_embedding = embedResult.embedding.values.slice(0, 768);

  const { data: chunks, error: rpcError } = await supabase
    .rpc('match_document_chunks', {
      query_embedding,
      match_threshold: 0.4,
      match_count: 5 
    });

  if (rpcError) throw rpcError;
  
  if (!chunks || chunks.length === 0) {
    throw new Error("I couldn't find enough information about that topic in your second brain to generate a test!");
  }

  const contextText = chunks.map((chunk: any) => `Document: ${chunk.document_title}\nContent: ${chunk.content}`).join("\n\n---\n\n");

  const chatModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
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
  const jsonText = completion.response.text();
  
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Failed to parse mock test JSON", jsonText);
    throw new Error("Failed to generate a valid test format.");
  }
}
