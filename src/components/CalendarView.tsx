import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, FileText, CheckCircle2, Circle } from 'lucide-react';

interface CalendarViewProps {
  documents: any[];
  onOpenNote: (doc: any) => void;
  workspaceId: string;
}

type EventItem = {
  id: string;
  text: string;
  completed: boolean;
};

const CalendarView: React.FC<CalendarViewProps> = ({ documents, onOpenNote, workspaceId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Record<string, EventItem[]>>(() => {
    const saved = localStorage.getItem(`calendarEvents_${workspaceId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });
  const [newEventText, setNewEventText] = useState("");
  const isFirstRender = useRef(true);

  // Handle workspace change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const saved = localStorage.getItem(`calendarEvents_${workspaceId}`);
    if (saved) {
      try { setEvents(JSON.parse(saved)); } catch (e) { setEvents({}); }
    } else {
      setEvents({});
    }
  }, [workspaceId]);

  // Save events to LocalStorage
  useEffect(() => {
    if (!isFirstRender.current) {
      localStorage.setItem(`calendarEvents_${workspaceId}`, JSON.stringify(events));
    }
  }, [events, workspaceId]);

  // Listen for agentic AI scheduling updates
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem(`calendarEvents_${workspaceId}`);
      if (saved) {
        try { setEvents(JSON.parse(saved)); } catch (e) { setEvents({}); }
      }
    };
    window.addEventListener('calendar-updated', handler);
    return () => window.removeEventListener('calendar-updated', handler);
  }, [workspaceId]);

  // Utility to format date to YYYY-MM-DD
  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const selectedDateKey = formatDateKey(selectedDate);
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  
  // Calendar Grid Logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // Empty slots for padding
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentYear, currentMonth, i));
  }

  // Filter notes for selected date
  const notesOnSelectedDate = documents.filter(doc => {
    if (!doc.document_created_at) return false;
    const docDate = new Date(doc.document_created_at);
    return formatDateKey(docDate) === selectedDateKey;
  });

  const dailyEvents = events[selectedDateKey] || [];

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventText.trim()) return;
    
    const newEvent: EventItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: newEventText.trim(),
      completed: false
    };

    setEvents(prev => ({
      ...prev,
      [selectedDateKey]: [...(prev[selectedDateKey] || []), newEvent]
    }));
    
    setNewEventText("");
  };

  const toggleEventComplete = (eventId: string) => {
    setEvents(prev => ({
      ...prev,
      [selectedDateKey]: prev[selectedDateKey].map(ev => 
        ev.id === eventId ? { ...ev, completed: !ev.completed } : ev
      )
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* Top Half: Calendar Grid */}
      <div className="bg-white border-2 border-[#5a5a5a] rounded-lg p-3 shadow-[2px_2px_0px_0px_#5a5a5a]">
        <div className="flex justify-between items-center mb-3">
          <button 
            onClick={() => setSelectedDate(new Date(currentYear, currentMonth - 1, 1))}
            className="text-[#5a5a5a] hover:bg-[#f3e5f5] p-1 rounded-md transition-colors"
          >
            &lt;
          </button>
          <h3 className="font-bold text-[#5a5a5a]">
            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <button 
            onClick={() => setSelectedDate(new Date(currentYear, currentMonth + 1, 1))}
            className="text-[#5a5a5a] hover:bg-[#f3e5f5] p-1 rounded-md transition-colors"
          >
            &gt;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-[10px] font-bold text-[#5a5a5a]/60">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-8" />;
            
            const dateKey = formatDateKey(day);
            const isSelected = dateKey === selectedDateKey;
            const isToday = dateKey === formatDateKey(new Date());
            
            // Check if there are notes or events on this day
            const hasNotes = documents.some(doc => doc.document_created_at && formatDateKey(new Date(doc.document_created_at)) === dateKey);
            const hasEvents = events[dateKey]?.length > 0;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={`h-8 rounded-md flex flex-col items-center justify-center relative text-xs font-bold transition-all
                  ${isSelected ? 'bg-[#5a5a5a] text-white shadow-inner' : 'hover:bg-[#fdfaf6] text-[#5a5a5a]'}
                  ${isToday && !isSelected ? 'border-2 border-[#5a5a5a]' : 'border-2 border-transparent'}
                `}
              >
                {day.getDate()}
                <div className="flex gap-0.5 absolute bottom-1">
                  {hasNotes && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[#c8e7ff]' : 'bg-[#5a5a5a]'}`} />}
                  {hasEvents && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[#ffd6e0]' : 'bg-[#ffd6e0]'}`} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Half: Agenda (Notes & Events) */}
      <div className="flex flex-col bg-white border-2 border-[#5a5a5a] rounded-lg p-3 shadow-[2px_2px_0px_0px_#5a5a5a]">
        <h4 className="font-bold text-[#5a5a5a] border-b-2 border-[#5a5a5a] pb-2 mb-3 text-sm">
          Agenda for {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </h4>
        
        <div className="space-y-4 pr-1">
          
          {/* Notes Section */}
          <div>
            <h5 className="text-[10px] font-bold text-[#5a5a5a]/60 uppercase tracking-widest mb-2">Saved Notes</h5>
            {notesOnSelectedDate.length === 0 ? (
              <p className="text-xs text-[#5a5a5a]/50 italic">No notes saved on this day.</p>
            ) : (
              <div className="space-y-2">
                {notesOnSelectedDate.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => onOpenNote(doc)}
                    className="flex items-center gap-2 p-2 rounded-md bg-[#e2f0cb]/50 border-2 border-[#5a5a5a] cursor-pointer hover:bg-[#e2f0cb] transition-colors"
                  >
                    <FileText className="w-3 h-3 text-[#5a5a5a]" />
                    <span className="text-xs font-bold text-[#5a5a5a] truncate">{doc.document_title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Section */}
          <div>
            <h5 className="text-[10px] font-bold text-[#5a5a5a]/60 uppercase tracking-widest mb-2">Schedule & Tasks</h5>
            {dailyEvents.length === 0 ? (
              <p className="text-xs text-[#5a5a5a]/50 italic mb-2">Nothing scheduled.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {dailyEvents.map(ev => (
                  <div 
                    key={ev.id}
                    className={`flex items-start gap-2 p-2 rounded-md border-2 border-[#5a5a5a] transition-colors
                      ${ev.completed ? 'bg-[#fdfaf6] opacity-60' : 'bg-[#ffd6e0]/50'}
                    `}
                  >
                    <button onClick={() => toggleEventComplete(ev.id)} className="mt-0.5 shrink-0">
                      {ev.completed ? 
                        <CheckCircle2 className="w-4 h-4 text-[#5a5a5a]" /> : 
                        <Circle className="w-4 h-4 text-[#5a5a5a]" />
                      }
                    </button>
                    <span className={`text-xs font-bold text-[#5a5a5a] ${ev.completed ? 'line-through' : ''}`}>
                      {ev.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <form onSubmit={handleAddEvent} className="flex gap-2">
              <input
                type="text"
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 bg-[#fdfaf6] border-2 border-[#5a5a5a] rounded-md px-2 py-1.5 text-xs font-bold text-[#5a5a5a] focus:outline-none focus:bg-white"
              />
              <button 
                type="submit"
                disabled={!newEventText.trim()}
                className="bg-[#5a5a5a] text-white p-1.5 rounded-md hover:bg-black transition-colors disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CalendarView;
