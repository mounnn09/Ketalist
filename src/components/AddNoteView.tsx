import React, { useState, useRef } from 'react';
import { YoutubeTranscript } from 'youtube-transcript';
import * as pdfjsLib from 'pdfjs-dist';
import { summarizeText } from '../lib/summarize';
import { processAndStoreDocument } from '../lib/embeddings';
import { MonitorPlay, FileText, Upload, Loader2 } from 'lucide-react';

// Use a stable CDN for the pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface AddNoteViewProps {
  categories: string[];
  onComplete: (newDoc: any, category: string) => void;
}

const AddNoteView: React.FC<AddNoteViewProps> = ({ categories, onComplete }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'youtube' | 'pdf'>('text');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0] || 'General');
  
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      let finalContent = content;
      let finalTitle = title;
      let sourceType: 'text' | 'link' | 'pdf' = 'text';

      if (activeTab === 'youtube') {
        const videoId = extractYoutubeId(youtubeUrl);
        if (!videoId) throw new Error("Invalid YouTube URL.");
        
        // 1. Fetch transcript from the local proxy to bypass CORS
        const res = await fetch(`/api/transcript?videoId=${videoId}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch YouTube transcript");
        }
        const data = await res.json();
        const rawText = data.transcript;
        
        // 2. Summarize via Gemini
        finalContent = await summarizeText(rawText, 'youtube');
        sourceType = 'link';
        if (!finalTitle) finalTitle = "YouTube Video Summary";
      } 
      else if (activeTab === 'pdf') {
        if (!pdfFile) throw new Error("Please select a PDF file.");
        
        // 1. Extract text from PDF
        const rawText = await extractPdfText(pdfFile);
        
        // 2. Summarize via Gemini
        finalContent = await summarizeText(rawText, 'pdf');
        sourceType = 'pdf';
        if (!finalTitle) finalTitle = pdfFile.name;
      }
      else {
        if (!finalTitle.trim() || !finalContent.trim()) {
          throw new Error("Title and content are required.");
        }
      }

      // Store in Supabase + Embed
      const newDoc = await processAndStoreDocument(finalTitle, finalContent, sourceType);
      onComplete(newDoc, category);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-[#5a5a5a] h-full">
      <div className="flex gap-2 border-b-2 border-[#5a5a5a] pb-2">
        <button 
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-1 text-xs font-bold rounded-t-md border-2 ${activeTab === 'text' ? 'bg-[#5a5a5a] text-white border-[#5a5a5a]' : 'border-transparent hover:bg-[#f3e5f5]'}`}
        >
          Text Note
        </button>
        <button 
          onClick={() => setActiveTab('youtube')}
          className={`flex-1 py-1 text-xs font-bold rounded-t-md border-2 flex items-center justify-center gap-1 ${activeTab === 'youtube' ? 'bg-[#ffd6e0] text-[#5a5a5a] border-[#5a5a5a]' : 'border-transparent hover:bg-[#ffd6e0]/50'}`}
        >
          <MonitorPlay className="w-3 h-3" /> YouTube
        </button>
        <button 
          onClick={() => setActiveTab('pdf')}
          className={`flex-1 py-1 text-xs font-bold rounded-t-md border-2 flex items-center justify-center gap-1 ${activeTab === 'pdf' ? 'bg-[#c8e7ff] text-[#5a5a5a] border-[#5a5a5a]' : 'border-transparent hover:bg-[#c8e7ff]/50'}`}
        >
          <FileText className="w-3 h-3" /> PDF
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 h-full">
        
        {/* Universal Fields */}
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder={activeTab === 'text' ? "Note Title" : "Title (Optional)"}
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isProcessing}
            required={activeTab === 'text'}
            className="flex-1 bg-[#fdfaf6] border-2 border-[#5a5a5a] rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:bg-white disabled:opacity-50"
          />
          <select 
            value={category}
            onChange={e => setCategory(e.target.value)}
            disabled={isProcessing}
            className="w-1/3 bg-[#fdfaf6] border-2 border-[#5a5a5a] rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:bg-white disabled:opacity-50"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Tab Specific Fields */}
        {activeTab === 'text' && (
          <textarea 
            placeholder="Write your note here..." 
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={isProcessing}
            required
            className="flex-1 bg-[#fdfaf6] border-2 border-[#5a5a5a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white resize-none disabled:opacity-50"
          />
        )}

        {activeTab === 'youtube' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#fdfaf6] border-2 border-dashed border-[#5a5a5a] rounded-lg p-4">
            <MonitorPlay className="w-12 h-12 text-[#ffd6e0]" />
            <p className="text-xs text-center font-bold px-4">Paste a YouTube link below. The AI will read the transcript and generate a comprehensive summary automatically.</p>
            <input 
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              disabled={isProcessing}
              required
              className="w-full bg-white border-2 border-[#5a5a5a] rounded-lg px-3 py-2 text-sm font-bold focus:outline-none disabled:opacity-50"
            />
          </div>
        )}

        {activeTab === 'pdf' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#fdfaf6] border-2 border-dashed border-[#5a5a5a] rounded-lg p-4">
            <Upload className="w-12 h-12 text-[#c8e7ff]" />
            <p className="text-xs text-center font-bold px-4">Upload a PDF document. The AI will extract the text and generate a comprehensive summary automatically.</p>
            
            <input 
              type="file" 
              accept=".pdf"
              ref={fileInputRef}
              onChange={e => e.target.files && setPdfFile(e.target.files[0])}
              className="hidden"
              disabled={isProcessing}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 py-2 bg-white border-2 border-[#5a5a5a] rounded-lg text-sm font-bold hover:bg-[#c8e7ff] transition-colors disabled:opacity-50"
            >
              {pdfFile ? pdfFile.name : "Select PDF File"}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-2 bg-red-100 border-2 border-red-500 text-red-700 text-xs font-bold rounded-lg">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={isProcessing}
          className="bg-[#5a5a5a] border-2 border-[#5a5a5a] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] text-white font-bold py-2 rounded-lg hover:bg-black transition-colors mt-auto flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> 
              Processing & Summarizing...
            </>
          ) : (
            "Save Note"
          )}
        </button>
      </form>
    </div>
  );
};

export default AddNoteView;
