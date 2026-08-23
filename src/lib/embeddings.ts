import { genAI } from './gemini';
import { supabase } from './supabase';

export async function generateEmbedding(text: string) {
  if (!genAI) throw new Error("Gemini not initialized. Missing VITE_GEMINI_API_KEY");
  
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  
  const result = await model.embedContent(text.replace(/\n/g, ' '));
  return result.embedding.values.slice(0, 768);
}

export function chunkText(text: string, chunkSize = 1000): string[] {
  // Very basic chunking logic for hackathon
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function processAndStoreDocument(
  title: string, 
  content: string, 
  sourceType: 'text' | 'link' | 'pdf'
) {
  if (!supabase) throw new Error("Supabase not initialized");

  // 1. Insert Document
  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert([{ title, source_type: sourceType, content_text: content }])
    .select()
    .single();

  if (docError) throw docError;

  // 2. Chunk Content
  const chunks = chunkText(content);

  // 3. Embed & Store Chunks
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    
    const { error: chunkError } = await supabase
      .from('document_chunks')
      .insert([{
        document_id: docData.id,
        content: chunk,
        embedding: embedding
      }]);
      
    if (chunkError) throw chunkError;
  }
  
  return docData;
}

export async function getDocuments() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
  
  // Map fields to match what the UI expects if they differ
  return data.map(doc => ({
    id: doc.id,
    document_title: doc.title,
    document_created_at: doc.created_at
  }));
}

export async function getDocumentContent(id: string) {
  if (!supabase) return "Supabase not initialized.";
  const { data, error } = await supabase
    .from('documents')
    .select('content_text')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching document content:", error);
    return "Error loading content.";
  }
  
  return data?.content_text || "No content found.";
}

export async function deleteDocument(id: string) {
  if (!supabase) throw new Error("Supabase not initialized");
  
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}
