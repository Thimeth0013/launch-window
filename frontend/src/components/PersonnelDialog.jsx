import React, { useEffect } from 'react';
import { X, Instagram, Twitter, ExternalLink, ShieldCheck, Orbit, Rocket, Footprints, Target, Award } from 'lucide-react';

const PersonnelDialog = ({ astronaut, isOpen, onClose, dateOfBirth }) => {

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !astronaut) return null;

  // Formatter for ISO 8601 Durations (P0DT0H...)
  const formatDuration = (duration) => {
    if (!duration || duration === "P0D" || duration === "P0DT0H0M0S") return "0D 0H 0M 0S";
    const regex = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
    const matches = duration.match(regex);
    const d = matches[1] || 0;
    const h = matches[2] || 0;
    const m = matches[3] || 0;
    const s = matches[4] || 0;
    return `${d}D ${h}H ${m}M ${s}S`;
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-6 overflow-y-auto md:overflow-hidden">
      
      <button 
        onClick={onClose} 
        className="fixed top-8 right-8 md:top-20 md:right-36 z-50 p-3 backdrop-blur-md border border-white/10 hover:bg-white transition-all group"
      >
        <X size={20} className="text-[#FF6B35] group-hover:text-black transition-transform" />
      </button>
      
      {/* Backdrop */}
      <div className="fixed inset-0 bg-transparent backdrop-blur-md animate-in fade-in duration-500" onClick={onClose}></div>

      {/* Cinematic Dialog Box */}
      <div className="relative bg-[#050505] border-y md:border border-white/20 w-full max-w-6xl min-h-full md:min-h-0 md:h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500 flex flex-col md:flex-row my-auto">
        
        {/* LEFT: Cinematic Hero Section (40% Width) */}
        <div className="relative w-full md:w-[40%] h-[60vh] md:h-auto overflow-hidden flex-shrink-0">
          <img src={astronaut.profile_image} alt={astronaut.name} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#050505] hidden md:block"></div>

          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center gap-2 mb-3 text-[#18BBF7]">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Verified Personnel</span>
            </div>
            <h2 className="text-4xl md:text-5xl text-left font-black uppercase tracking-tighter text-white mb-4 leading-none">
              {astronaut.name}
            </h2>
            <div className="text-left border-l-2 border-[#FF6B35] pl-4">
              <p className="text-white text-base font-black uppercase leading-tight mb-1">{astronaut.agency?.name || 'Independent'}</p>
              <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">// {astronaut.agency?.agencyType || 'Government Entity'}</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Data Terminal Section (60% Width) */}
        <div className="flex-1 flex flex-col relative md:w-[40%]">
          <div className="overflow-y-auto p-8 md:p-12 flex-1 custom-scrollbar">
            
            {/* Biography Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-[10px] font-black tracking-[0.5em] uppercase text-zinc-600">Personnel Bio</h3>
                <div className="h-px flex-1 bg-white/10"></div>
              </div>
              <p className="text-zinc-400 text-sm leading-loose font-light uppercase tracking-widest text-justify">
                {astronaut.bio || "No biography available in mission records."}
              </p>
            </div>

            {/* Career Highlight Counters */}
            <div className="flex flex-wrap items-center justify-between gap-6 py-4 border-y border-white/10 px-1">
              {[
                { Icon: Rocket, label: 'Flights', val: astronaut.flights_count },
                { Icon: Footprints, label: 'Spacewalks', val: astronaut.spacewalks_count },
                { Icon: Target, label: 'Landings', val: astronaut.landings_count },
                { Icon: Orbit, label: 'In Space', val: astronaut.in_space ? "YES" : "NO", active: astronaut.in_space }
              ].map(({ Icon, label, val, active = val > 0 }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#18BBF7]' : 'text-zinc-600'}`} />
                  <div>
                    <p className="text-[10px] leading-none text-zinc-500 uppercase tracking-tighter">{label}</p>
                    <p className={`text-sm font-mono font-bold text-left px-1 ${active ? 'text-white' : 'text-zinc-600'}`}>
                      {val || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Core Data Dossier Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12 pt-10 border-t border-white/10 text-left mb-12">
              <div className="flex flex-col">
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Duty Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    astronaut.status?.name?.toLowerCase() === 'active' 
                      ? 'bg-[#18BBF7] animate-pulse shadow-[0_0_8px_#18BBF7]' 
                      : astronaut.status?.name?.toLowerCase() === 'in-training'
                      ? 'bg-[#FF6B35] animate-pulse shadow-[0_0_8px_#FF6B35]'
                      : 'bg-zinc-600'
                  }`}></div>
                  <p className="text-white text-sm font-bold uppercase tracking-wide">{astronaut.status?.name || 'Unavailable'}</p>
                </div>
              </div>
              
              <div className="flex flex-col">
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Nationality / Origin</span>
                <p className="text-white text-sm font-bold  uppercase tracking-wide">{astronaut.nationality}</p>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Personnel Rank</span>
                <p className="text-white text-sm font-mono uppercase tracking-wide">
                    {astronaut.flights_count > 0 ? "Veteran Astronaut" : "Astronaut Candidate"}
                </p>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Date of Birth</span>
                <p className="text-white text-sm font-mono uppercase tracking-wide">
                  {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                </p>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Career EVA Time</span>
                <p className="text-white text-sm font-mono tracking-wider">{formatDuration(astronaut.eva_time)}</p>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Total Space Time</span>
                <p className="text-white text-sm font-mono tracking-wider">{formatDuration(astronaut.time_in_space)}</p>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Most Recent Launch</span>
                <p className="text-white text-sm font-mono uppercase tracking-wide">
                  {astronaut.last_flight ? new Date(astronaut.last_flight).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Footer / Socials */}
            <div className="flex flex-wrap gap-8 mt-16 pt-6 border-t border-white/5">
              {astronaut.twitter && (
                <a href={astronaut.twitter} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-[#18BBF7] transition-all group">
                  <Twitter size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Twitter</span>
                </a>
              )}
              {astronaut.instagram && (
                <a href={astronaut.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-[#18BBF7] transition-all group">
                  <Instagram size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Instagram</span>
                </a>
              )}
              {astronaut.wiki && (
                <a href={astronaut.wiki} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-[#18BBF7] transition-all group">
                  <ExternalLink size={14} /><span className="text-[9px] font-black uppercase tracking-widest">Wikipedia</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonnelDialog;