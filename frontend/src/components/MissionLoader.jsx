import { useState, useEffect } from 'react';

const MissionLoader = ({ message = "Initialising Feeds" }) => {
  const [statusIndex, setStatusIndex] = useState(0);
  
  // These statuses reflect the background processes we've built 
  // (1-hour Launch Sync and 12-hour Stream Sync)
  const statuses = [
    "Establishing Secure Uplink...",
    "Syncing Global Mission Manifest...",
    "Scanning YouTube Data Array...",
    "Verifying Signal Integrity...",
    "Decrypting Telemetry Stream...",
    "Synchronizing Chronology (2026)..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-black text-white relative overflow-hidden font-mono">
      {/* Background CRT Scanline Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />

      <div className="flex flex-col items-center w-full max-w-md p-10 border-2 border-[#18BBF7]/30 bg-black/80 backdrop-blur-sm relative z-10 shadow-[0_0_50px_rgba(24,187,247,0.1)]">
        {/* Top Header */}
        <div className="w-full flex justify-between items-center mb-10 border-b border-[#18BBF7]/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#18BBF7] animate-pulse" />
            <span className="text-[10px] font-black tracking-[0.3em] text-[#18BBF7]">UPLINK_STATUS: ACTIVE</span>
          </div>
          <span className="text-[9px] text-[#18BBF7]/50 uppercase tracking-widest">VER_2.6.0</span>
        </div>

        {/* Central Animation: Scanning Bar */}
        <div className="relative w-full h-[2px] bg-[#18BBF7]/10 mb-10 overflow-hidden">
          <div className="absolute top-0 h-full w-32 bg-[#18BBF7] shadow-[0_0_15px_#18BBF7] animate-scan-slide" />
        </div>

        {/* Text Container */}
        <div className="text-center space-y-4">
          <h2 className="text-[#18BBF7] text-sm font-black tracking-[0.6em] uppercase animate-pulse">
            {message}
          </h2>
          <div className="h-4 flex items-center justify-center">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] italic">
              {statuses[statusIndex]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionLoader;