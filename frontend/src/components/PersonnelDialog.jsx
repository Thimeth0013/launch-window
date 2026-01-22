import React, { useEffect } from 'react';
import { X, Instagram, Twitter, ExternalLink, ShieldCheck, Orbit, Rocket, Footprints, Target, Award } from 'lucide-react';

const PersonnelDialog = ({ astronaut, isOpen, onClose }) => {

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
        <div className="flex-1 flex flex-col bg-[#050505] relative md:w-[60%]">
          <div className="overflow-y-auto p-8 md:p-12 flex-1 custom-scrollbar">
            
            {/* Career Highlight Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-white/5 border border-white/10 p-4 text-center group hover:border-[#FF6B35] transition-colors">
                    <Rocket className="w-4 h-4 mx-auto mb-2 text-[#FF6B35]" />
                    <span className="block text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Flights</span>
                    <span className="text-lg font-mono font-bold text-white">{astronaut.flights_count || 0}</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 text-center group hover:border-[#18BBF7] transition-colors">
                    <Footprints className="w-4 h-4 mx-auto mb-2 text-[#18BBF7]" />
                    <span className="block text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Spacewalks</span>
                    <span className="text-lg font-mono font-bold text-white">{astronaut.spacewalks_count || 0}</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 text-center group hover:border-white transition-colors">
                    <Target className="w-4 h-4 mx-auto mb-2 text-zinc-400" />
                    <span className="block text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Landings</span>
                    <span className="text-lg font-mono font-bold text-white">{astronaut.landings_count || 0}</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 text-center group hover:border-[#4ade80] transition-colors">
                    <Orbit className="w-4 h-4 mx-auto mb-2 text-[#4ade80]" />
                    <span className="block text-[8px] text-zinc-500 uppercase tracking-widest mb-1">In Space</span>
                    <span className="text-lg font-mono font-bold text-white">{astronaut.in_space ? "YES" : "NO"}</span>
                </div>
            </div>

            {/* Biography Section */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-[10px] font-black tracking-[0.5em] uppercase text-zinc-600">Personnel Bio</h3>
                <div className="h-px flex-1 bg-white/10"></div>
              </div>
              <p className="text-zinc-400 text-sm leading-loose font-light uppercase tracking-widest text-justify">
                {astronaut.bio || "No biography available in mission records."}
              </p>
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
                  <p className="text-white text-sm font-bold uppercase tracking-wide">{astronaut.status?.name || 'Active'}</p>
                </div>
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
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Personnel Rank</span>
                <p className="text-white text-sm font-bold uppercase tracking-wide">
                    {astronaut.flights_count > 0 ? "Veteran Astronaut" : "Astronaut Candidate"}
                </p>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Nationality / Origin</span>
                <p className="text-white text-sm font-bold uppercase tracking-wide">{astronaut.nationality}</p>
              </div>

              <div className="flex flex-col">
                <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Date of Birth</span>
                <p className="text-white text-sm font-bold uppercase tracking-wide">
                  {astronaut.date_of_birth ? new Date(astronaut.date_of_birth).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Career Milestones / Timeline Section */}
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-8">
                    <h3 className="text-[10px] font-black tracking-[0.5em] uppercase text-zinc-600">Career Milestones</h3>
                    <div className="h-px flex-1 bg-white/10"></div>
                </div>
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-[#FF6B35]"></div>
                            <div className="w-px h-full bg-white/10"></div>
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">First Deployment</p>
                            <p className="text-white text-xs font-bold uppercase tracking-widest">
                                {astronaut.first_flight ? new Date(astronaut.first_flight).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Awaiting Assignment'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-[#18BBF7]"></div>
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Most Recent Launch</p>
                            <p className="text-white text-xs font-bold uppercase tracking-widest">
                                {astronaut.last_flight ? new Date(astronaut.last_flight).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                            </p>
                        </div>
                    </div>
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