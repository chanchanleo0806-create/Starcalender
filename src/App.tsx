import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO 
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MapPin, 
  Clock, 
  Sparkles, 
  Trash2,
  X,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent } from './types';
import { getAISummary } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customAiPrompt, setCustomAiPrompt] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const event: CalendarEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      location: newLocation,
      startTime: newStartTime,
      endTime: newEndTime,
      description: newDescription,
      date: newDate,
    };

    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      setEvents([...events, event]);
      setIsModalOpen(false);
      resetForm();
      // If the added event is on a different month, we might want to navigate there, 
      // but for now let's just stay.
    } catch (err) {
      console.error('Failed to add event', err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      setEvents(events.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete event', err);
    }
  };

  const downloadIcs = (event: CalendarEvent) => {
    const start = event.date.replace(/-/g, '') + 'T' + event.startTime.replace(/:/g, '') + '00';
    const end = event.date.replace(/-/g, '') + 'T' + event.endTime.replace(/:/g, '') + '00';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${event.title}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllDayIcs = () => {
    if (selectedDayEvents.length === 0) return;

    const eventsContent = selectedDayEvents.map(event => {
      const start = event.date.replace(/-/g, '') + 'T' + event.startTime.replace(/:/g, '') + '00';
      const end = event.date.replace(/-/g, '') + 'T' + event.endTime.replace(/:/g, '') + '00';
      return [
        'BEGIN:VEVENT',
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description || ''}`,
        `LOCATION:${event.location || ''}`,
        'END:VEVENT'
      ].join('\n');
    }).join('\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      eventsContent,
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `schedule-${format(selectedDate, 'yyyy-MM-dd')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewLocation('');
    setNewStartTime('09:00');
    setNewEndTime('10:00');
    setNewDescription('');
    setNewDate(format(selectedDate, 'yyyy-MM-dd'));
  };

  const handleAiSummary = async () => {
    const dayEvents = events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'));
    if (dayEvents.length === 0) {
      setAiSummary("오늘 일정이 없습니다.");
      return;
    }

    setIsAiLoading(true);
    try {
      // Respecting the user's security constraint: only include details if asked or if it's a general summary
      const summary = await getAISummary(dayEvents, customAiPrompt || "오늘의 전체적인 흐름을 요약해줘.");
      setAiSummary(summary || "요약을 생성할 수 없습니다.");
    } catch (err) {
      console.error('AI Summary failed', err);
      setAiSummary("AI 요약 중 오류가 발생했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-8 py-12 bg-white border-b border-zinc-100">
        <div className="relative">
          <span className="absolute -top-8 left-0 text-[120px] font-display font-black text-zinc-100/50 -z-10 select-none">
            {format(currentMonth, 'MM')}
          </span>
          <h2 className="text-4xl font-display font-bold text-zinc-900">
            {format(currentMonth, 'MMMM yyyy', { locale: ko })}
          </h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return (
      <div className="calendar-grid border-b border-zinc-100 bg-zinc-50/50">
        {days.map((day, i) => (
          <div 
            key={i} 
            className={cn(
              "py-4 text-center text-xs font-bold uppercase tracking-widest",
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-zinc-400"
            )}
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const hasEvents = events.some(e => e.date === format(cloneDay, 'yyyy-MM-dd'));
        
        days.push(
          <div
            key={day.toString()}
            className={cn(
              "relative h-32 border-r border-b border-zinc-100 p-2 cursor-pointer transition-all hover:bg-zinc-50",
              isSameDay(day, selectedDate) ? "bg-zinc-100/50" : ""
            )}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <span className={cn(
              "inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-full",
              !isSameMonth(day, monthStart) 
                ? "text-zinc-300" 
                : i === 0 
                  ? "text-red-500" 
                  : i === 6 
                    ? "text-blue-500" 
                    : "text-zinc-900",
              isSameDay(day, new Date()) ? "bg-zinc-900 !text-white" : ""
            )}>
              {formattedDate}
            </span>
            <div className="mt-1 space-y-1 overflow-hidden">
              {events
                .filter(e => e.date === format(cloneDay, 'yyyy-MM-dd'))
                .slice(0, 2)
                .map(e => (
                  <div key={e.id} className="text-[10px] px-1.5 py-0.5 bg-zinc-900 text-white rounded truncate">
                    {e.title}
                  </div>
                ))}
              {events.filter(e => e.date === format(cloneDay, 'yyyy-MM-dd')).length > 2 && (
                <div className="text-[9px] text-zinc-400 pl-1">
                  + {events.filter(e => e.date === format(cloneDay, 'yyyy-MM-dd')).length - 2} more
                </div>
              )}
            </div>
            {isSameDay(day, selectedDate) && (
              <motion.div 
                layoutId="active-day"
                className="absolute inset-0 border-2 border-zinc-900 pointer-events-none"
              />
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="calendar-grid" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  const selectedDayEvents = events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side: Calendar */}
      <div className="flex-1 bg-white border-r border-zinc-200">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>

      {/* Right Side: Details & AI */}
      <div className="w-full lg:w-[450px] bg-[#fcfcfc] flex flex-col h-screen sticky top-0 overflow-y-auto">
        <div className="p-8 space-y-8">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Schedule</p>
              <h3 className="text-2xl font-display font-bold">
                {format(selectedDate, 'MMMM d, EEEE', { locale: ko })}
              </h3>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
            >
              <Plus size={24} />
            </button>
          </header>

          {/* AI Summary Section */}
          <section className="p-6 rounded-3xl bg-zinc-900 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles size={80} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="flex items-center gap-2 font-bold text-sm tracking-tight">
                  <Sparkles size={16} className="text-emerald-400" />
                  AI 일정 요약
                </h4>
              </div>
              
              <div className="mb-4">
                <input 
                  type="text"
                  value={customAiPrompt}
                  onChange={(e) => setCustomAiPrompt(e.target.value)}
                  placeholder="예: 위치와 시간을 포함해서 요약해줘"
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                />
                <button 
                  onClick={handleAiSummary}
                  disabled={isAiLoading}
                  className="w-full mt-2 text-[10px] uppercase tracking-widest font-bold px-3 py-2 bg-emerald-500 text-zinc-900 rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {isAiLoading ? '생성 중...' : '요약 생성'}
                </button>
              </div>

              <div className="text-sm leading-relaxed text-zinc-300 min-h-[60px]">
                {aiSummary ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="italic opacity-50 text-xs">일정을 요약해보세요. 보안을 위해 위치/시간 정보는 요청 시에만 포함됩니다.</p>
                )}
              </div>
            </div>
          </section>

          {/* Event List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Events</h4>
              {selectedDayEvents.length > 0 && (
                <button 
                  onClick={downloadAllDayIcs}
                  className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <Download size={12} />
                  전체 저장
                </button>
              )}
            </div>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-zinc-900">{event.title}</h5>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => downloadIcs(event)}
                            className="text-zinc-300 hover:text-zinc-900 transition-colors"
                            title="폰에 저장"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-zinc-300 hover:text-red-500 transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Clock size={14} />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <MapPin size={14} />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                    <p className="text-sm text-zinc-400">일정이 없습니다.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-display font-bold">New Event</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddEvent} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Date</label>
                    <input 
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-zinc-900 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Title</label>
                    <input 
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="무엇을 하나요?"
                      className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-zinc-900 transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Start</label>
                      <input 
                        type="time"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-zinc-900 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">End</label>
                      <input 
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-zinc-900 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Location</label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="어디서 하나요?"
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-zinc-900 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20"
                  >
                    일정 추가하기
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
