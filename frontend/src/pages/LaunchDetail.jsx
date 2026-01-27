import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLaunchById, fetchStreamsForLaunch, fetchAstronautById } from '../services/api';
import Countdown from '../components/Countdown';
import StreamGrid from '../components/StreamGrid';
import LaunchChat from '../components/LaunchChat';
import MissionLoader from '../components/MissionLoader';
import PersonnelDialog from '../components/PersonnelDialog';
import { ChevronLeft, Pin, MessageSquareCode } from 'lucide-react';

const LaunchDetail = () => {
  const { id } = useParams();
  const [launch, setLaunch] = useState(null);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedAstro, setSelectedAstro] = useState(null);
  const [isAstroLoading, setIsAstroLoading] = useState(false);
  const [selectedDateOfBirth, setSelectedDateOfBirth] = useState(null);

  const handleAstroClick = async (crewMember) => {
    try {
      setIsAstroLoading(true);
      // This calls your backend, which handles the saving/caching logic
      const data = await fetchAstronautById(crewMember.astronaut.id); 
      setSelectedDateOfBirth(crewMember.astronaut.date_of_birth);
      setSelectedAstro(data);
    } catch (err) {
      console.error("Failed to retrieve personnel file:", err);
    } finally {
      setIsAstroLoading(false);
    }
  };

  const openCountdownPiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert('Picture-in-Picture not supported in your browser');
      return;
    }
    if (!launch || !launch.date) return;
    const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 250, height: 150 });

    [...document.styleSheets].forEach((styleSheet) => {
      try {
        const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
        const style = document.createElement('style');
        style.textContent = cssRules;
        pipWindow.document.head.appendChild(style);
      } catch (e) {}
    });

    pipWindow.document.body.innerHTML = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { overflow: hidden; background: #0f0f0f; font-family: 'Courier New', monospace; }
        .container { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 10px; border: 1px solid #18BBF7; }
        .title { font-size: 11px; color: #18BBF7; font-weight: bold; text-align: center; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .countdown { font-size: 18px; font-weight: bold; color: #FF6B35; text-shadow: 0 0 10px rgba(255, 107, 53, 0.5); }
      </style>
      <div class="container">
        <div class="title">${launch.name}</div>
        <div id="pip-countdown" class="countdown pulse">CALCULATING...</div>
      </div>
    `;

    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(launch.date);
      const diff = target - now;
      const display = pipWindow.document.getElementById('pip-countdown');
      if (!display) return;
      if (diff <= 0) { display.textContent = 'LAUNCHED!'; display.style.color = '#4ade80'; return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      display.textContent = `${days}d ${hours}h ${mins}m ${secs}s`;
    };

    const interval = setInterval(updateCountdown, 1000);
    updateCountdown();
    pipWindow.addEventListener('unload', () => clearInterval(interval));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [launchData, streamsData] = await Promise.all([
          fetchLaunchById(id),
          fetchStreamsForLaunch(id)
        ]);
        setLaunch(launchData);
        setStreams(streamsData);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    loadData();
  }, [id]);

  if (loading) return <MissionLoader message="Syncing Mission Telemetry" />;
  if (!launch) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Uplink Failed</div>;

  // Dynamic telemetry
  const telemetryData = [
    { label: 'Vehicle', value: launch.rocket?.name },
    { label: 'Mission', value: launch.mission?.name },
    ...(launch.spacecraft_stage ? [{ 
      label: 'Spacecraft Unit', 
      value: launch.spacecraft_stage.spacecraft?.name,
      subValue: launch.spacecraft_stage.spacecraft?.configuration?.name 
    }] : []),
    ...(launch.launcher_stage?.[0] ? [{ 
      label: 'Booster', 
      value: launch.launcher_stage[0].launcher?.serial_number,
      subValue: `${launch.launcher_stage[0].reused ? ': REUSED' : ': NEW'} / SEQ #${launch.launcher_stage[0].launcher_flight_number || '1'}`
    }] : []),
    { label: 'Launch Site', value: launch.pad?.location?.split(',')[0] },
    { label: 'Provider', value: launch.provider }
  ].filter(item => item.value);

  const shouldScroll = telemetryData.length > 3 || telemetryData.some(item => item.value?.length > 20);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#18BBF7] selection:text-black overflow-x-hidden">
      <div className="relative min-h-screen flex flex-col">
        {launch.image && (
          <>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${launch.image})` }}></div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,1) 100%)' }}></div>
          </>
        )}

        <div className="relative z-10 flex flex-col flex-1">
          <header className="pt-8">
            <div className="container mx-auto px-4 md:px-8 fixed left-0 right-0 z-[100] flex items-center justify-between">
              <Link to="/" className="p-3 bg-black/40 border border-white/10 backdrop-blur-md text-[#FF6B35] hover:bg-white hover:text-black">
                <ChevronLeft className="w-6 h-6" />
              </Link>
              <button onClick={openCountdownPiP} className="p-3 bg-black/40 border border-white/10 backdrop-blur-md text-[#FF6B35] hover:bg-white hover:text-black">
                <Pin className="w-6 h-6" />
              </button>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center py-10">
            <div className="container mx-auto px-8 text-center max-w-6xl">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 leading-none">
                {launch.name}
              </h1>
              <div className="h-1.5 w-32 bg-[#FF6B35] mx-auto mb-14 shadow-[0_0_15px_rgba(255,107,53,0.6)]"></div>

              <div className="mb-14 flex flex-col justify-center items-center">
                <h3 className="text-xs font-bold mb-6 tracking-[0.5em] uppercase text-[#18BBF7]">Mission Clock // T-Minus</h3>
                {launch.date && <Countdown targetDate={launch.date}/>}
              </div>

              {/* DYNAMIC TELEMETRY SECTION */}
              <div className={`mt-12 mb-16 relative overflow-hidden ${!shouldScroll ? 'flex justify-center' : ''}`}>
                <div className={`flex py-6 ${shouldScroll ? 'hover:pause-marquee' : 'w-full'}`}>
                  <div className={`flex ${shouldScroll ? 'animate-marquee' : 'justify-center w-full'}`}>
                    
                    {/* Render Telemetry Blocks */}
                    {telemetryData.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex-none w-[280px] md:w-[320px] px-8 flex flex-col items-center justify-center text-center border-r border-white/30 last:border-r-0 md:last:border-r"
                      >
                        <span className="text-gray-400 text-[10px] tracking-[0.3em] uppercase block mb-3 font-bold">
                          {item.label}
                        </span>
                        <p className="font-mono text-sm md:text-base text-white leading-relaxed uppercase break-words w-full">
                          {item.value || '---'} {item.subValue}
                        </p>
                      </div>
                    ))}

                    {/* Duplicate for infinite loop (Only if scrolling) */}
                    {shouldScroll && telemetryData.map((item, idx) => (
                      <div 
                        key={`dup-${idx}`} 
                        className="flex-none w-[280px] md:w-[320px] px-8 flex flex-col items-center justify-center text-center border-r border-white/10"
                      >
                        <span className="text-gray-500 text-[10px] tracking-[0.3em] uppercase block mb-3 font-bold">
                          {item.label}
                        </span>
                        <p className="font-mono text-sm md:text-base text-white leading-relaxed uppercase break-words w-full">
                          {item.value || '---'} {item.subValue} 
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

{/* Crew Manifest */}
{launch.spacecraft_stage?.launch_crew?.length > 0 && (
  <div className="mt-16 mb-16">
    <h2 className="text-[10px] font-bold mb-8 tracking-[0.4em] uppercase text-[#18BBF7]">Flight Crew // Manifest</h2>
    <div className="flex flex-wrap justify-center gap-10">
      {launch.spacecraft_stage.launch_crew.map((member) => (
        <div 
          key={member.id} 
          onClick={() => handleAstroClick(member)} 
          className="flex flex-col items-center text-center group cursor-pointer relative"
        >
          {/* Image Container */}
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full mb-4 p-1 border border-white/10 group-hover:border-[#FF6B35] transition-all duration-500">
            <div className="w-full h-full rounded-full overflow-hidden relative">
              <img 
                src={member.astronaut.profile_image} 
                alt={member.astronaut.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" 
              />
              
              {/* Hover Indicator Overlay */}
              <div className="absolute inset-0 group-hover:opacity-100 group-hover:bg-black/60 flex items-center justify-center transition-opacity duration-300">
                <div className=" scale-0 group-hover:scale-100 transition-transform duration-500">
                  <span className="text-[10px] text-[#FF6B35] font-black uppercase tracking-tighter">View Bio</span>
                </div>
              </div>
            </div>
          
          </div>

          <p className="text-[10px] text-[#FF6B35] font-mono uppercase mb-1 tracking-widest">{member.role.role}</p>
          <p className="text-xs font-bold text-white uppercase group-hover:text-[#18BBF7] transition-colors">{member.astronaut.name}</p>
        </div>
      ))}
    </div>

    <PersonnelDialog 
      astronaut={selectedAstro} 
      isOpen={!!selectedAstro} 
      onClose={() => setSelectedAstro(null)} 
      dateOfBirth={selectedDateOfBirth}
    />
    
    {isAstroLoading && (
      <div className="fixed inset-0 z-[2100] bg-black/90 p-10 flex items-center justify-center">
        <div className="text-[#18BBF7] font-mono text-xs animate-pulse uppercase tracking-[0.5em]">
          Establishing Personnel Uplink...
        </div>
      </div>
    )}
  </div>
)}

              {launch.mission?.description && (
                <div className="max-w-4xl mx-auto mt-10 text-center mb-10">
                  <h2 className="text-xs font-bold mb-4 tracking-[0.3em] uppercase text-[#18BBF7]">Mission Briefing</h2>
                  <p className="text-gray-300 font-light text-sm md:text-base leading-relaxed tracking-wide uppercase">
                    {launch.mission.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black border-t-4 border-[#18BBF7]">
        <div className="container mx-auto py-20 px-8">
          <div className="mb-12 flex items-end justify-between border-b border-white/10 pb-6">
            <h2 className="text-3xl font-black tracking-tighter uppercase text-[#FF6B35]">Telemetry Feeds</h2>
          </div>
          {streams.length > 0 ? <StreamGrid streams={streams} /> : <div className="py-20 text-center border border-dashed border-white/10 opacity-30 uppercase text-xs">No active video downlinks detected</div>}
        </div>
      </div>

      <button onClick={() => setIsChatOpen(true)} className="fixed bottom-8 right-8 z-[500] bg-[#18BBF7] text-black p-4 shadow-[0_0_20px_rgba(24,187,247,0.4)] hover:bg-white">
        <MessageSquareCode size={28} />
      </button>

      <LaunchChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} launchName={launch.name} launchData={launch} />
    </div>
  );
};

export default LaunchDetail;