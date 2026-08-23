import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, FileText, LayoutDashboard, BrainCircuit, Settings, Edit3, Folder, ChevronDown, PlusCircle, Calendar, Trash2 } from 'lucide-react';
import { getDocuments, getDocumentContent, processAndStoreDocument, deleteDocument } from './lib/embeddings';
import { askTimeMachine } from './lib/rag';
import DraggableWindow from './components/DraggableWindow';
import OnboardingTour from './components/OnboardingTour';
import MockTestView from './components/MockTestView';
import CalendarView from './components/CalendarView';
import AddNoteView from './components/AddNoteView';
import AuthView from './components/AuthView';
import { supabase } from './lib/supabase';

type WindowData = {
  id: string;
  type: 'chat' | 'note' | 'mock-test' | 'settings' | 'add-note' | 'calendar';
  title: string;
  color: string;
  content?: string;
  zIndex: number;
  position: { x: number; y: number };
};

type Message = { role: 'user' | 'ai', content: string, source?: any };

const COLORS = [
  "bg-[#ffd6e0]", // pink
  "bg-[#c8e7ff]", // blue
  "bg-[#e2f0cb]", // mint
  "bg-[#f3e5f5]", // lavender
  "bg-[#ffe5b4]", // peach
];

// Mock Categories for Hackathon Demo
const MOCK_CATEGORIES = ["General", "Biology 101", "Computer Science"];

function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "General": true,
    "Biology 101": true,
    "Computer Science": true
  });
  
  // Fake Auth State for demo
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      // ALWAYS show onboarding for the hackathon demo
      setShowOnboarding(true);
    }
  }, [isAuthenticated]);
  
  // Workspace State
  const [workspaceId, setWorkspaceId] = useState('default');
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [workspaces, setWorkspaces] = useState<string[]>(() => {
    const saved = localStorage.getItem('timeMachineWorkspaces');
    return saved ? JSON.parse(saved) : ['default', 'school', 'personal'];
  });

  useEffect(() => {
    localStorage.setItem('timeMachineWorkspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  // App State
  const [documents, setDocuments] = useState<any[]>([]);
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [activeZIndex, setActiveZIndex] = useState(10);
  
  // Chat state (stored per workspace in real app, but global here for simplicity in MVP)
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'ai', 
      content: "👋 **Welcome to Ketalist!**\n\nI'm your personal second brain. To get started, open the **Add Note** app in the sidebar to upload a PDF, paste a YouTube link, or type some notes. I'll remember everything so you can ask me questions later!"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Desktop constraints ref
  const desktopRef = useRef<HTMLDivElement>(null);

  // Load windows when workspace changes
  useEffect(() => {
    fetchDocuments();
    const savedWindows = localStorage.getItem(`timeMachineWindows_${workspaceId}`);
    if (savedWindows) {
      try {
        const parsed = JSON.parse(savedWindows);
        setWindows(parsed);
        const maxZ = Math.max(...parsed.map((w: any) => w.zIndex), 10);
        setActiveZIndex(maxZ);
      } catch (e) {
        initializeDefaultWindows();
      }
    } else {
      initializeDefaultWindows();
    }
  }, [workspaceId]);

  // Save windows to local storage whenever they change
  useEffect(() => {
    if (windows.length > 0) {
      localStorage.setItem(`timeMachineWindows_${workspaceId}`, JSON.stringify(windows));
    }
  }, [windows, workspaceId]);

  const initializeDefaultWindows = () => {
    setWindows([
      {
        id: 'chat-main',
        type: 'chat',
        title: 'Ketalist',
        color: 'bg-[#c8e7ff]',
        zIndex: 10,
        position: { x: 50, y: 50 }
      }
    ]);
  };

  const fetchDocuments = async () => {
    const docs = await getDocuments();
    const savedCategories = JSON.parse(localStorage.getItem('timeMachineCategories') || '{}');
    const docsWithCategories = docs.map((doc) => ({
      ...doc,
      category: savedCategories[doc.id] || "General"
    }));
    setDocuments(docsWithCategories);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this note from your Second Brain? This action cannot be undone.")) {
      try {
        await deleteDocument(id);
        // Remove from UI
        setDocuments(prev => prev.filter(d => d.id !== id));
        // Remove from local memory map
        const catMap = JSON.parse(localStorage.getItem('timeMachineCategories') || '{}');
        delete catMap[id];
        localStorage.setItem('timeMachineCategories', JSON.stringify(catMap));
      } catch (err) {
        alert("Failed to delete the note. Check console for details.");
      }
    }
  };

  const bringToFront = React.useCallback((id: string) => {
    setActiveZIndex(prev => {
      const nextZIndex = prev + 1;
      setWindows(wins => wins.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
      return nextZIndex;
    });
  }, []);

  const closeWindow = React.useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const handlePositionChange = React.useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, position: { x, y } } : w));
  }, []);

  const openNoteWindow = async (doc: any) => {
    if (windows.some(w => w.id === `note-${doc.id}`)) {
      bringToFront(`note-${doc.id}`);
      return;
    }
    
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newWindow: WindowData = {
      id: `note-${doc.id}`,
      type: 'note',
      title: doc.document_title || 'Untitled Note',
      color: randomColor,
      content: "Loading content...",
      zIndex: activeZIndex + 1,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 }
    };
    
    setActiveZIndex(prev => prev + 1);
    setWindows(prev => [...prev, newWindow]);

    const content = await getDocumentContent(doc.id);
    setWindows(prev => prev.map(w => w.id === `note-${doc.id}` ? { ...w, content } : w));
  };

  const spawnSystemWindow = (type: 'mock-test' | 'settings' | 'add-note' | 'calendar', title: string, color: string) => {
    if (windows.some(w => w.id === type)) {
      bringToFront(type);
      return;
    }
    
    setWindows(prev => [...prev, {
      id: type,
      type: type,
      title: title,
      color: color,
      zIndex: activeZIndex + 1,
      position: { x: 300, y: 100 }
    }]);
    setActiveZIndex(prev => prev + 1);
  };

  const handleAddNoteComplete = async (newDoc: any, category: string) => {
    try {
      if (newDoc && newDoc.id) {
        const savedCategories = JSON.parse(localStorage.getItem('timeMachineCategories') || '{}');
        savedCategories[newDoc.id] = category;
        localStorage.setItem('timeMachineCategories', JSON.stringify(savedCategories));
      }
      await fetchDocuments();
      closeWindow('add-note');
    } catch (err) {
      console.error("Failed to complete note addition:", err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const newQuery = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: newQuery }]);
    setIsTyping(true);
    
    // Ensure chat window is open
    if (!windows.some(w => w.id === 'chat-main')) {
      setWindows(prev => [...prev, {
        id: 'chat-main',
        type: 'chat',
        title: 'Ketalist',
        color: 'bg-[#c8e7ff]',
        zIndex: activeZIndex + 1,
        position: { x: 50, y: 50 }
      }]);
      setActiveZIndex(prev => prev + 1);
    }
    
    try {
      const result = await askTimeMachine(newQuery);
      let finalAnswer = result.answer;
      
      // Agentic Scheduling Hook
      const scheduleMatch = finalAnswer.match(/\[SCHEDULE_INTENT:\s*({.*?})\]/);
      if (scheduleMatch) {
        try {
          const scheduleData = JSON.parse(scheduleMatch[1]);
          if (scheduleData.title && scheduleData.date) {
            // Read current events
            const savedEvents = localStorage.getItem(`calendarEvents_${workspaceId}`);
            const eventsMap = savedEvents ? JSON.parse(savedEvents) : {};
            
            // Add new event
            if (!eventsMap[scheduleData.date]) {
              eventsMap[scheduleData.date] = [];
            }
            eventsMap[scheduleData.date].push({
              id: Date.now().toString(),
              title: scheduleData.title,
              time: scheduleData.time || 'All Day',
              type: scheduleData.type || 'study'
            });
            
            // Save back
            localStorage.setItem(`calendarEvents_${workspaceId}`, JSON.stringify(eventsMap));
            
            // Programmatically open Calendar and trigger re-render
            spawnSystemWindow('calendar', 'Calendar & Schedule', 'bg-[#c8e7ff]');
            window.dispatchEvent(new Event('calendar-updated'));
          }
        } catch (e) {
          console.error("Failed to parse schedule intent", e);
        }
        // Hide the internal tag from the user
        finalAnswer = finalAnswer.replace(/\[SCHEDULE_INTENT:\s*{.*?}\]/g, '').trim();
      }

      setMessages(prev => [...prev, { role: 'ai', content: finalAnswer, source: result.source }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: `Oops, something went wrong: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEditChat = (index: number) => {
    const msg = messages[index];
    if (msg.role === 'user') {
      setQuery(msg.content);
      // Truncate messages back to this point to allow "rewriting" history
      setMessages(prev => prev.slice(0, index));
    }
  };

  // Group documents by category
  const groupedDocs = MOCK_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = documents.filter(d => d.category === cat);
    return acc;
  }, {} as Record<string, any[]>);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  if (!isAuthenticated) {
    return <AuthView onLogin={() => setIsAuthenticated(true)} />;
  }

  if (showOnboarding) {
    return (
      <OnboardingTour onComplete={() => {
        localStorage.setItem('onboarded_global', 'true');
        setShowOnboarding(false);
      }} />
    );
  }

  return (
    <>
      <div 
        ref={desktopRef}
        className="w-full h-screen bg-[#f5f1ea] overflow-hidden relative selection:bg-[#ffd6e0] selection:text-[#5a5a5a]"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}
      >
        
        {/* Render all Draggable Windows */}
        {windows.map(win => (
          <DraggableWindow 
            key={win.id}
            id={win.id}
            title={win.title}
            color={win.color}
            defaultPosition={win.position}
            zIndex={win.zIndex}
            constraintsRef={desktopRef}
            onFocus={bringToFront}
            onClose={closeWindow}
            onPositionChange={handlePositionChange}
          >
            {win.type === 'chat' && (
              <div className="flex flex-col gap-4 h-full pb-4">
                {messages.length === 0 && (
                  <p className="text-sm text-[#5a5a5a] text-center italic mt-10 font-medium">Send a message below to start chatting!</p>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group relative`}>
                    
                    {msg.role === 'user' && (
                      <button 
                        onClick={() => handleEditChat(idx)}
                        className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 p-1.5 bg-[#5a5a5a] text-white rounded-full transition-opacity shadow-md"
                        title="Edit and rewrite history"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}

                    <div className={`px-3 py-2 rounded-xl text-sm border-2 border-[#5a5a5a] max-w-[90%] shadow-[2px_2px_0px_0px_#5a5a5a] ${msg.role === 'user' ? 'bg-[#ffd6e0]' : 'bg-white'}`}>
                      {msg.role === 'ai' ? (
                        <div className="markdown-content font-medium text-[#5a5a5a]">
                          <ReactMarkdown
                            components={{
                              a: ({ node, ...props }) => (
                                <a 
                                  {...props} 
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer pointer-events-auto"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (props.href) window.open(props.href, '_blank', 'noopener,noreferrer');
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                />
                              )
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span className="font-bold text-[#5a5a5a]">{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-start">
                    <div className="px-3 py-2 rounded-xl border-2 border-[#5a5a5a] bg-white shadow-[2px_2px_0px_0px_#5a5a5a]">
                      <span className="animate-pulse text-[#5a5a5a] font-bold">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {win.type === 'note' && (
              <div className="text-sm font-medium text-[#5a5a5a] leading-relaxed pb-4">
                {win.content === "Loading content..." ? (
                  <p className="animate-pulse">{win.content}</p>
                ) : (
                  <div className="markdown-content">
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => (
                          <a 
                            {...props} 
                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer pointer-events-auto"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (props.href) window.open(props.href, '_blank', 'noopener,noreferrer');
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          />
                        )
                      }}
                    >
                      {win.content || ''}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {win.type === 'mock-test' && (
              <MockTestView />
            )}

            {win.type === 'add-note' && (
              <div className="flex flex-col gap-2 h-full">
                <AddNoteView categories={MOCK_CATEGORIES} onComplete={handleAddNoteComplete} />
              </div>
            )}

            {win.type === 'calendar' && (
              <CalendarView 
                documents={documents} 
                onOpenNote={openNoteWindow} 
                workspaceId={workspaceId} 
              />
            )}

            {win.type === 'settings' && (
              <div className="flex flex-col gap-4 text-[#5a5a5a]">
                <h3 className="font-bold text-lg border-b-2 border-[#5a5a5a] pb-2">Preferences</h3>
                
                <div className="flex items-center justify-between p-3 bg-white border-2 border-[#5a5a5a] rounded-lg shadow-[2px_2px_0px_0px_#5a5a5a]">
                  <span className="font-bold text-sm">Theme</span>
                  <select className="bg-[#fdfaf6] border-2 border-[#5a5a5a] font-bold text-xs p-1 rounded-md outline-none">
                    <option>Pastel Retro</option>
                    <option>Dark Mode (Soon)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 bg-white border-2 border-[#5a5a5a] rounded-lg shadow-[2px_2px_0px_0px_#5a5a5a]">
                  <span className="font-bold text-sm">AI Temperature</span>
                  <input type="range" className="w-24 accent-[#5a5a5a]" />
                </div>
                
                <button 
                  onClick={() => {
                    localStorage.removeItem(`timeMachineWindows_${workspaceId}`);
                    window.location.reload();
                  }}
                  className="mt-4 w-full bg-[#ffd6e0] border-2 border-[#5a5a5a] shadow-[2px_2px_0px_0px_#5a5a5a] text-[#5a5a5a] font-bold py-2 rounded-lg hover:bg-[#ffb3c6] transition-colors"
                >
                  Reset Workspace Layout
                </button>

                <div className="mt-2 pt-4 border-t-2 border-[#5a5a5a]/20 text-center">
                  <p className="text-[10px] font-bold text-[#5a5a5a]/70 uppercase tracking-widest mb-1">About Ketalist</p>
                  <p className="text-xs font-medium text-[#5a5a5a]">Created by <span className="font-black text-black">Moun Patel</span></p>
                  <p className="text-[10px] font-medium text-[#5a5a5a]/80 mt-1">Supported by <span className="font-bold text-black">Ansh Nakrani</span> & <span className="font-bold text-black">Parth Patel</span></p>
                </div>
              </div>
            )}
          </DraggableWindow>
        ))}

        {/* Right Sidebar Toggle Button (when closed) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#5a5a5a] text-white p-3 rounded-l-xl shadow-[-4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:pr-5 transition-all z-50 flex items-center gap-2"
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
        )}

        {/* Right Sidebar */}
        <div className={`absolute top-4 md:top-6 right-[2.5%] md:right-6 bottom-24 md:bottom-6 w-[95%] md:w-80 bg-[#fdfaf6] border-[3px] border-[#5a5a5a] rounded-xl shadow-[4px_4px_0px_0px_#5a5a5a] md:shadow-[6px_6px_0px_0px_#5a5a5a] flex flex-col overflow-hidden z-[200] transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}>
          {/* Header */}
          <div className="bg-[#5a5a5a] px-4 py-2 flex items-center justify-between">
            <h2 className="text-white text-xs font-bold tracking-wider uppercase">Apps & Sources</h2>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Workspace Switcher */}
          <div className="bg-[#5a5a5a] p-2 relative pt-0">
            <button 
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="w-full flex items-center justify-between bg-white/10 hover:bg-[#ffd6e0]/30 hover:border-[#ffd6e0] p-2 rounded-lg transition-colors border border-white/20"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#f3e5f5] rounded-md flex items-center justify-center border-2 border-[#5a5a5a]">
                  <LayoutDashboard className="w-3 h-3 text-[#5a5a5a]" />
                </div>
                <div className="text-left">
                  <span className="block text-white text-[10px] font-bold uppercase tracking-wider leading-tight">Workspace</span>
                  <span className="block text-white text-xs font-bold leading-tight capitalize">{workspaceId}</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
            
            {showWorkspaceMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-[3px] border-[#5a5a5a] rounded-xl shadow-[4px_4px_0px_0px_#5a5a5a] z-50 overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  {workspaces.map(ws => (
                    <div key={ws} className="flex items-center border-b-2 last:border-b-0 border-[#5a5a5a] group hover:bg-[#ffd6e0]">
                      <button 
                        onClick={() => { setWorkspaceId(ws); setShowWorkspaceMenu(false); }}
                        className="flex-1 text-left px-4 py-3 text-[#5a5a5a] font-bold text-sm capitalize"
                      >
                        {ws}
                      </button>
                      {ws !== 'default' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${ws} workspace? This won't delete the data, just the shortcut.`)) {
                              setWorkspaces(prev => prev.filter(w => w !== ws));
                              if (workspaceId === ws) setWorkspaceId('default');
                            }
                          }}
                          className="px-3 py-3 text-red-500 font-bold opacity-0 group-hover:opacity-100 hover:text-red-700 transition-opacity"
                        >
                          X
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t-2 border-[#5a5a5a] p-2 bg-[#fdfaf6]">
                  <input 
                    type="text" 
                    placeholder="Type name & press Enter to add" 
                    className="w-full bg-white border-2 border-[#5a5a5a] rounded px-2 py-2 text-xs font-bold focus:outline-none placeholder-[#a0a0a0] text-[#5a5a5a]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim().toLowerCase();
                        if (val && !workspaces.includes(val)) {
                          setWorkspaces([...workspaces, val]);
                          setWorkspaceId(val);
                          e.currentTarget.value = '';
                          setShowWorkspaceMenu(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Apps */}
          <div className="p-3 border-b-2 border-[#5a5a5a]/10 space-y-3">
            <button 
              onClick={() => spawnSystemWindow('calendar', 'Calendar & Schedule', 'bg-[#c8e7ff]')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-[#5a5a5a] bg-white hover:bg-[#c8e7ff] transition-all shadow-[2px_2px_0px_0px_#5a5a5a] active:translate-y-[2px] active:shadow-none group"
            >
              <Calendar className="w-5 h-5 text-[#5a5a5a] group-hover:-translate-y-1 transition-transform" />
              <span className="text-sm font-bold text-[#5a5a5a]">Calendar</span>
            </button>
            <button 
              onClick={() => spawnSystemWindow('mock-test', 'Quiz Generator', 'bg-[#ffe5b4]')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-[#5a5a5a] bg-white hover:bg-[#ffe5b4] transition-all shadow-[2px_2px_0px_0px_#5a5a5a] active:translate-y-[2px] active:shadow-none group"
            >
              <BrainCircuit className="w-5 h-5 text-[#5a5a5a] group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-[#5a5a5a]">Quiz Generator</span>
            </button>
            <button 
              onClick={() => spawnSystemWindow('settings', 'Settings', 'bg-[#f3e5f5]')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-[#5a5a5a] bg-white hover:bg-[#f3e5f5] transition-all shadow-[2px_2px_0px_0px_#5a5a5a] active:translate-y-[2px] active:shadow-none group"
            >
              <Settings className="w-5 h-5 text-[#5a5a5a] group-hover:rotate-45 transition-transform" />
              <span className="text-sm font-bold text-[#5a5a5a]">Settings</span>
            </button>
          </div>

          {/* Categories & Sources */}
          <div className="flex-1 overflow-y-auto space-y-4 p-3 bg-[#fdfaf6]">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 mt-8 opacity-60">
                <FileText className="w-10 h-10 text-[#5a5a5a] mb-3 opacity-50" />
                <h3 className="font-bold text-[#5a5a5a] text-sm mb-1 uppercase tracking-tight">Your brain is empty!</h3>
                <p className="text-[10px] text-[#5a5a5a] font-medium leading-relaxed">Click "Add Note" above to start building your knowledge base.</p>
              </div>
            ) : MOCK_CATEGORIES.map(category => {
                const categoryDocs = groupedDocs[category] || [];
                if (categoryDocs.length === 0) return null;
              
              const isExpanded = expandedCategories[category];

              return (
                <div key={category} className="space-y-2">
                  <button 
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-[#c8e7ff] rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className={`w-4 h-4 ${isExpanded ? 'text-[#c8e7ff] fill-[#5a5a5a]' : 'text-[#5a5a5a]/50'}`} />
                      <h3 className="text-[10px] font-bold text-[#5a5a5a]/80 uppercase tracking-widest">{category}</h3>
                    </div>
                    <ChevronDown className={`w-3 h-3 text-[#5a5a5a] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isExpanded && (
                    <div className="pl-2 space-y-2">
                      {categoryDocs.map(doc => (
                        <div 
                          key={doc.id}
                          className="flex items-center gap-3 p-2 rounded-lg border-2 border-[#5a5a5a] bg-white hover:bg-[#e2f0cb] cursor-pointer transition-all hover:translate-x-1 shadow-sm group"
                        >
                          <div 
                            className="flex items-center gap-3 flex-1 overflow-hidden" 
                            onClick={() => openNoteWindow(doc)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#e2f0cb] border-2 border-[#5a5a5a] flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                              <FileText className="w-4 h-4 text-[#5a5a5a]" />
                            </div>
                            <div className="overflow-hidden flex-1">
                              <p className="text-xs font-bold text-[#5a5a5a] truncate">{doc.document_title}</p>
                              <p className="text-[10px] font-medium text-[#5a5a5a]/60">Click to open</p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => handleDeleteNote(doc.id, e)}
                            className="w-8 h-8 flex items-center justify-center rounded bg-[#ffd6e0] border-2 border-[#5a5a5a] opacity-0 group-hover:opacity-100 hover:bg-[#ffb3c6] transition-all shrink-0 shadow-[2px_2px_0px_0px_#5a5a5a] active:translate-y-[2px] active:shadow-none"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#5a5a5a]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar: Chat Input */}
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[95%] md:w-[600px] bg-white border-[3px] border-[#5a5a5a] rounded-xl shadow-[4px_4px_0px_0px_#5a5a5a] md:shadow-[6px_6px_0px_0px_#5a5a5a] flex flex-col overflow-hidden z-[100]">
          <div className="bg-[#5a5a5a] px-4 py-1.5 text-center flex items-center justify-between">
            <span className="text-white text-[10px] font-bold tracking-widest uppercase">Enter your message</span>
          </div>
          <div className="p-3">
            <form onSubmit={handleSearch} className="flex gap-3">
              <button 
                type="button"
                onClick={() => spawnSystemWindow('add-note', 'Add New Note', 'bg-[#c8e7ff]')}
                className="bg-[#c8e7ff] border-[3px] border-[#5a5a5a] text-[#5a5a5a] p-3 rounded-lg hover:bg-[#a6d8ff] transition-colors"
                title="Add new note"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask Ketalist..."
                className="flex-1 bg-[#fdfaf6] border-[3px] border-[#5a5a5a] rounded-lg px-4 py-2 text-sm font-bold text-[#5a5a5a] placeholder-[#5a5a5a]/40 focus:outline-none focus:bg-white"
              />
              <button 
                type="submit"
                disabled={!query.trim()}
                className="bg-[#5a5a5a] text-white p-3 rounded-lg hover:bg-black transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

      </div>

      <style>{`
        .markdown-content strong { font-weight: 900; }
        .markdown-content p { margin-bottom: 0.5rem; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content ul { list-style-type: square; padding-left: 1.5rem; }
      `}</style>
    </>
  );
}

export default App;
