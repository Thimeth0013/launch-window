import React, { useEffect } from 'react';
import { X, Instagram, Twitter, ExternalLink, ShieldCheck } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-6 overflow-y-auto md:overflow-hidden">
      
      <button 
            onClick={onClose} 
            className="fixed top-8 right-8 md:top-20 md:right-36 z-50 p-3 backdrop-blur-md border border-white/10 hover:bg-white transition-all group"
          >
            <X size={20} className="text-[#FF6B35] group-hover:text-black transition-transform" />
      </button>
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500"
        onClick={onClose}
      ></div>

      {/* Cinematic Dialog Box */}
      <div className="relative bg-[#050505] border-y md:border border-white/10 w-full max-w-6xl min-h-full md:min-h-0 md:h-[80vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500 flex flex-col md:flex-row my-auto">
        
        {/* LEFT: Cinematic Hero Section */}
        <div className="relative w-full md:w-1/2 h-[90vh] md:h-auto overflow-hidden flex-shrink-0">
          <img 
            src={astronaut.profile_image} 
            alt={astronaut.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradients to blend image into the dark UI */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#050505] hidden md:block"></div>

          {/* Personnel Overlay Info */}
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center gap-2 mb-3 text-[#18BBF7]">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Verified Personnel</span>
            </div>
            <h2 className="text-4xl md:text-5xl text-left font-black uppercase tracking-tighter text-white mb-4">
              {astronaut.name}
            </h2>
            <div className="text-left border-l-2 border-[#FF6B35] pl-4">
              <p className="text-white text-base md:text-lg font-black uppercase leading-tight mb-1">
                {astronaut.agency?.name || 'Independent'}
              </p>
              <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">
                // {astronaut.agency?.agencyType || 'Government Entity'}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Data Terminal Section */}
        <div className="flex-1 flex flex-col bg-[#050505] relative">

          {/* Content Area */}
          <div className="overflow-y-auto p-8 md:p-12 flex-1 custom-scrollbar flex flex-col justify-between">
            
            <div>
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

              {/* Data Dossier Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 border-t border-white/10 text-left">
                <div className="flex flex-col">
                  <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Nationality</span>
                  <p className="text-white text-sm font-bold uppercase tracking-wide">
                    {astronaut.nationality}
                  </p>
                </div>

                <div className="flex flex-col">
                  <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Duty Status</span>
                  <div className="flex items-center gap-2">
                    {/* Fixed Logic: Blue for Active */}
                    <div className={`w-1.5 h-1.5 rounded-full ${astronaut.status?.name?.toLowerCase() === 'active' ? 'bg-[#18BBF7] shadow-[0_0_8px_#18BBF7]' : 'bg-zinc-600'}`}></div>
                    <p className="text-white text-sm font-bold uppercase tracking-wide">
                      {astronaut.status?.name || 'Active'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">Personnel ID</span>
                  <p className="text-white text-sm font-mono">
                    #{astronaut.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Social Links at Bottom */}
            <div className="flex flex-wrap gap-8 mt-8 pt-6 border-t border-white/5">
              {astronaut.twitter && (
                <a href={astronaut.twitter} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-[#18BBF7] transition-all group">
                  <Twitter size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest group-hover:tracking-[0.2em] transition-all">Twitter</span>
                </a>
              )}
              {astronaut.instagram && (
                <a href={astronaut.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-[#18BBF7] transition-all group">
                  <Instagram size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest group-hover:tracking-[0.2em] transition-all">Instagram</span>
                </a>
              )}
              {astronaut.wiki && (
                <a href={astronaut.wiki} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-[#18BBF7] transition-all group">
                  <ExternalLink size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest group-hover:tracking-[0.2em] transition-all">Wikipedia</span>
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