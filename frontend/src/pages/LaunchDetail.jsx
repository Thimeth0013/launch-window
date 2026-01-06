import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLaunchById, fetchStreamsForLaunch } from '../services/api';
import Countdown from '../components/Countdown';
import StreamGrid from '../components/StreamGrid';
import LaunchChat from '../components/LaunchChat';
import MissionLoader from '../components/MissionLoader';
import { ChevronLeft, Pin, MessageSquareCode } from 'lucide-react';

const LaunchDetail = () => {
  const { id } = useParams();
  const [launch, setLaunch] = useState(null);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openCountdownPiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert('Picture-in-Picture not supported in your browser');
      return;
    }
    if (!launch || !launch.date) return;

    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 250,
      height: 150,
    });

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

      if (diff <= 0) {
        display.textContent = 'LAUNCHED!';
        display.style.color = '#4ade80';
        return;
      }

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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return <MissionLoader message="Syncing Mission Telemetry" />;
  }

  if (!launch) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="border border-[#18BBF7] px-12 py-8 bg-black/50">
          <div className="text-xl font-bold tracking-widest uppercase text-[#FF6B35]">Uplink Failed: Data Not Found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#18BBF7] selection:text-black">
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
              <Link to="/" className="p-3 bg-black/40 border border-white/10 backdrop-blur-md text-[#FF6B35] hover:bg-white hover:text-black transition-none">
                <ChevronLeft className="w-6 h-6" />
              </Link>

              <button onClick={openCountdownPiP} className="p-3 bg-black/40 border border-white/10 backdrop-blur-md text-[#FF6B35] hover:bg-white hover:text-black transition-none">
                <Pin className="w-6 h-6" />
              </button>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center py-10">
            <div className="container mx-auto px-8 text-center max-w-6xl">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 leading-none" 
                  style={{ color: '#ffffff', textShadow: '0 0 30px rgba(255, 255, 255, 0.2)' }}>
                {launch.name}
              </h1>
              <div className="h-1.5 w-32 bg-[#FF6B35] mx-auto mb-14 shadow-[0_0_15px_rgba(255,107,53,0.6)]"></div>

              <div className="mb-20 flex flex-col justify-center items-center">
                <h3 className="text-xs font-bold mb-6 tracking-[0.5em] uppercase text-[#18BBF7]">
                  Mission Clock // T-Minus
                </h3>
                {launch && launch.date && <Countdown targetDate={launch.date}/>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 font-mono">
                <div className="p-6 border-r border-b md:border-b-0 border-white/10">
                  <span className="text-gray-500 text-[10px] tracking-widest uppercase block mb-2">Vehicle</span>
                  <p className="font-bold text-white text-sm md:text-base uppercase">{launch.rocket?.name || '---'}</p>
                </div>
                <div className="p-6 border-b md:border-b-0 md:border-r border-white/10">
                  <span className="text-gray-500 text-[10px] tracking-widest uppercase block mb-2">Mission</span>
                  <p className="font-bold text-white text-sm md:text-base uppercase">{launch.mission?.name || '---'}</p>
                </div>
                <div className="p-6 border-r border-white/10">
                  <span className="text-gray-500 text-[10px] tracking-widest uppercase block mb-2">Site</span>
                  <p className="font-bold text-white text-sm md:text-base uppercase">{launch.pad?.location || '---'}</p>
                </div>
                <div className="p-6">
                  <span className="text-gray-500 text-[10px] tracking-widest uppercase block mb-2">Provider</span>
                  <p className="font-bold text-white text-sm md:text-base uppercase">{launch.provider || '---'}</p>
                </div>
              </div>

              {launch.mission?.description && (
                <div className="max-w-8xl mx-auto mt-20 text-center mb-10">
                  <h2 className="text-xs font-bold mb-4 tracking-[0.3em] uppercase text-[#18BBF7]">
                    Mission Parameters
                  </h2>
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
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase text-[#FF6B35]">
                Telemetry Feeds
              </h2>
              {streams.length > 0 && (
                <p className="text-gray-500 font-mono text-[10px] mt-2 tracking-widest uppercase">
                  {streams.length} Verified Signal{streams.length !== 1 ? 's' : ''} Detected
                </p>
              )}
            </div>
          </div>

          {streams.length > 0 ? (
            <StreamGrid streams={streams} />
          ) : (
            <div className="py-20 text-center border border-dashed border-white/10">
              <p className="text-gray-600 font-mono text-xs uppercase tracking-widest">
                No active video downlinks available for this sequence.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Industrial Floating Chat Trigger */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 z-[500] bg-[#18BBF7] text-black p-4 shadow-[0_0_20px_rgba(24,187,247,0.4)] hover:bg-white transition-none"
      >
        <MessageSquareCode size={28} />
      </button>

      {/* Context-Aware Chat Overlay */}
      <LaunchChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        launchName={launch.name}
        launchData={launch}
      />
    </div>
  );
};

export default LaunchDetail;