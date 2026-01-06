import { useState, useEffect, useRef } from 'react';
import { X, Terminal, Loader2, Zap } from 'lucide-react';
import axios from 'axios';

const LaunchChat = ({ isOpen, onClose, launchName = null, launchData = null }) => {
  const [message, setMessage] = useState('');
  const [isBooting, setIsBooting] = useState(true);
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // --- 1. Terminal Boot Sequence (Mission Aware) ---
  useEffect(() => {
    if (isOpen) {
      setIsBooting(true);
      setChatLog([]); // Reset log for new session
      
      const bootMessages = [
        "INITIALIZING UPLINK PROTOCOL...",
        launchName 
          ? `ESTABLISHING DATA LINK: ${launchName.toUpperCase()}...` 
          : "SYNCING GLOBAL MISSION CATALOG...",
      ];

      bootMessages.forEach((msg, i) => {
        setTimeout(() => {
          setChatLog(prev => [...prev, { role: 'ai', text: msg }]);
          if (i === bootMessages.length - 1) setIsBooting(false);
        }, i * 300);
      });
    }
  }, [isOpen, launchName]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLog]);

  // --- 2. Advanced Tactical Parser (Bolding + Bullet Logic) ---
  const formatTerminalText = (text) => {
    // Parser for **text** -> Glowing Bold
    const parseBold = (str) => {
      const parts = str.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={i} className="text-white font-black shadow-[0_0_10px_rgba(255,255,255,0.4)]">
              {part.slice(2, -2)}
            </span>
          );
        }
        return part;
      });
    };

    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-2" />;

      // Header Logic (Lines ending in : or purely bold)
      if (trimmed.endsWith(':') && !trimmed.startsWith('*')) {
        return (
          <div key={index} className="text-[#FF6B35] font-black mt-6 mb-2 tracking-[0.2em] text-sm border-b border-[#FF6B35]/20 pb-1">
            {parseBold(trimmed.toUpperCase())}
          </div>
        );
      }

      // Bullet Point Logic (* or ▶)
      if (trimmed.startsWith('*') || trimmed.startsWith('▶')) {
        return (
          <div key={index} className="pl-4 flex items-start gap-3 text-[#18BBF7] my-2">
            <span className="text-[#FF6B35] flex-shrink-0 mt-1 text-[10px]">▶</span>
            <span className="tracking-wide uppercase text-[12px]">
              {parseBold(trimmed.replace(/^[*▶]\s*/, ''))}
            </span>
          </div>
        );
      }

      // Indented / Nested Data
      if (line.startsWith('    ')) {
        return (
          <div key={index} className="pl-12 text-white/40 text-[11px] mb-1 italic border-l border-white/10 ml-4 uppercase">
            {parseBold(trimmed)}
          </div>
        );
      }

      // Standard Telemetry Text
      return (
        <p key={index} className="mb-2 text-white/80 leading-relaxed uppercase tracking-widest text-[12px]">
          {parseBold(trimmed)}
        </p>
      );
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading || isBooting) return;

    const userMsg = { role: 'user', text: message.toUpperCase() };
    const currentHistory = [...chatLog, userMsg];
    setChatLog(currentHistory);
    setMessage('');
    setLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const response = await axios.post(`${API_BASE_URL}/chat/ask`, {
        question: message,
        history: currentHistory.slice(-10),
        launchName,
        launchData // This is crucial for "Mission Mode"
      });

      setChatLog(prev => [...prev, { role: 'ai', text: response.data.answer }]);
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'ai', text: 'ERROR: SIGNAL_DEGRADED. RE-ESTABLISH_UPLINK.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4 bg-black/95 backdrop-blur-md">
      {/* 6XL Width + 90VH Height */}
      <div className="w-full max-w-6xl bg-black border-2 border-[#18BBF7] flex flex-col h-[90vh] relative overflow-hidden terminal-flicker">
        
        {/* CRT Scanline Effect */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#18BBF7]/5 scanline-effect pointer-events-none z-50"></div>

        {/* Industrial Header */}
        <div className="bg-[#18BBF7] p-4 flex justify-between items-center z-10 border-b-2 border-black">
          <div className="flex items-center gap-3 text-black font-black uppercase text-base tracking-tighter">
            <Zap size={20} className="fill-current" />
            <span>MISSION_INTEL // {launchName ? `LINKED: ${launchName.toUpperCase()}` : 'GLOBAL_ARRAY'}</span>
          </div>
          
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="text-black hover:bg-black hover:text-[#18BBF7] p-1 transition-all">
              <X size={32} />
            </button>
          </div>
        </div>

        {/* Chat Log Body */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-10 space-y-8 font-mono bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] hide-scrollbar"
          style={{ backgroundSize: '100% 2px, 3px 100%' }}
        >
          {chatLog.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} boot-sequence`}>
              <div className={`max-w-[90%] p-6 border-l-8 transition-all ${
                msg.role === 'user' 
                ? 'border-[#FF6B35] bg-[#FF6B35]/5 text-white' 
                : 'border-[#18BBF7] bg-[#18BBF7]/5 text-[#18BBF7]'
              }`}>
                <div className="text-[10px] opacity-40 mb-4 tracking-[0.4em] font-black uppercase flex items-center gap-2">
                   <div className={`w-1 h-1 ${msg.role === 'user' ? 'bg-[#FF6B35]' : 'bg-[#18BBF7]'}`} />
                   {msg.role === 'user' ? 'OPERATOR_LOCAL' : 'INTEL_ARRAY_V2'}
                </div>
                
                <div className="tracking-widest leading-relaxed">
                  {msg.role === 'ai' ? formatTerminalText(msg.text) : msg.text}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex items-center gap-4 text-[#18BBF7] border border-[#18BBF7]/20 p-4 w-fit bg-[#18BBF7]/5 animate-pulse">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[10px] tracking-[0.6em] uppercase">Receiving Telemetry Data...</span>
            </div>
          )}
        </div>

        {/* Tactical Input Bar */}
        <form onSubmit={handleSend} className="p-8 border-t-2 border-[#18BBF7]/30 bg-black z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.9)]">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Terminal size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#18BBF7]/40" />
              <input
                autoFocus
                disabled={isBooting}
                className="w-full bg-black border border-white/10 p-5 pl-14 text-[#18BBF7] focus:outline-none focus:border-[#18BBF7] uppercase text-sm tracking-widest placeholder:text-white/5 disabled:opacity-30"
                placeholder={isBooting ? "UPLINK INITIALIZING..." : "ENTER MISSION COMMAND..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              disabled={isBooting}
              className="bg-[#18BBF7] px-12 text-black font-black uppercase text-sm hover:bg-white transition-all disabled:opacity-30 active:scale-95"
            >
              Execute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LaunchChat;