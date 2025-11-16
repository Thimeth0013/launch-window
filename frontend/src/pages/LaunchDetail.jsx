import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLaunchById, fetchStreamsForLaunch } from '../services/api';
import Countdown from '../components/Countdown';
import StreamGrid from '../components/StreamGrid';
import { ChevronLeft, Loader2, Pin } from 'lucide-react';

const LaunchDetail = () => {
  const { id } = useParams();
  const [launch, setLaunch] = useState(null);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // In LaunchDetail.jsx
  const openCountdownPiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert('Picture-in-Picture not supported in your browser');
      return;
    }

    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 20,
      height: 20,
    });

    // Copy styles to PiP window
    [...document.styleSheets].forEach((styleSheet) => {
      try {
        const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
        const style = document.createElement('style');
        style.textContent = cssRules;
        pipWindow.document.head.appendChild(style);
      } catch (e) {}
    });

    // Create countdown display optimized for PiP
    pipWindow.document.body.innerHTML = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          overflow: hidden;
          background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 6px;
          gap: 4px;
        }
        
        .title {
          font-size: 13px;
          color: #18BBF7;
          font-weight: 600;
          text-align: center;
          line-height: 1.3;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .countdown {
          font-size: 16px;
          font-weight: bold;
          color: #FF6B35;
          font-family: 'Courier New', monospace;
          text-shadow: 0 2px 8px rgba(255, 107, 53, 0.5);
          letter-spacing: 1px;
        }
        
        .pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      </style>
      <div class="container">
        <div class="title">${launch.name}</div>
        <div id="pip-countdown" class="countdown pulse"></div>
      </div>
    `;

    // Update countdown
    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(launch.date);
      const diff = target - now;

      if (diff <= 0) {
        pipWindow.document.getElementById('pip-countdown').textContent = 'LAUNCHED!';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      pipWindow.document.getElementById('pip-countdown').textContent = 
        `${days}d ${hours}h ${mins}m ${secs}s`;
    };

    const interval = setInterval(updateCountdown, 1000);
    updateCountdown();

    // Cleanup when PiP closes
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
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 animate-spin" style={{ color: '#18BBF7' }} />
          <span className="mt-6 text-lg md:text-2xl font-light tracking-widest uppercase">Loading launch details</span>
        </div>
      </div>
    );
  }

  if (!launch) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="border-4 px-12 py-8" style={{ borderColor: '#18BBF7' }}>
          <div className="text-xl font-light tracking-wide uppercase">Launch not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Background Image */}
      <div className="relative min-h-screen flex flex-col">
        {/* Background Image with Gradient Overlay */}
        {launch.image && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${launch.image})` }}
            ></div>
            <div 
              className="absolute inset-0"
              style={{ 
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.9) 100%)'
              }}
            ></div>
          </>
        )}

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <header className="pt-8">
          <div className="container mx-2 md:mx-8 px-4 md:px-0 fixed left-0 right-0 z-100 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[#FF6B35] md:text-white/80 hover:text-[#FF6B35] transition-all group"
            >
              <ChevronLeft className="w-8 h-8 transition-transform group-hover:-translate-x-1 bg-white md:bg-white/10 backdrop-blur-md hover:bg-white p-1" />
            </Link>

            <button
              onClick={openCountdownPiP}
              className="bg-white/10 text-[#FF6B35] md:text-white/80 font-semibold hover:bg-white hover:text-[#FF6B35] transition-all"
            >
              <Pin className="w-8 h-8 p-1 transition-transform group-hover:-translate-x-1 bg-white md:bg-white/10 backdrop-blur-md hover:bg-white"/>
            </button>
          </div>
        </header>

          {/* Main Content - Vertically Centered */}
          <div className="flex-1 flex items-center justify-center py-12 pt-6">
            <div className="container mx-auto px-8 text-center">
              {/* Launch Title */}
              <h1 className="text-3xl md:text-7xl font-bold tracking-wide uppercase mb-6 drop-shadow-2xl" style={{ color: '#ffffff', textShadow: '0 0 40px rgba(255, 255, 255, 0.5)' }}>
                {launch.name}
              </h1>
              <div className="h-1 w-32 mx-auto mb-12" style={{ backgroundColor: '#FF6B35', boxShadow: '0 0 20px rgba(255, 107, 53, 0.8)' }}></div>

              {/* Countdown - Centered */}
              <div className="mb-16 flex flex-col justify-center items-center">
                <h3 className="text-lg font-bold mb-8 tracking-widest uppercase" style={{ color: '#18BBF7', textShadow: '0 0 20px rgba(24, 187, 247, 0.5)' }}>
                  Time Until Launch
                </h3>
                <Countdown targetDate={launch.date}/>
              </div>

              {/* Launch Details - Horizontal Layout */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto mb-12">
                <div>
                  <span className="text-gray-300 text-xs tracking-widest uppercase block mb-2 drop-shadow-lg">Rocket</span>
                  <p className="font-light text-white text-md md:text-lg tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{launch.rocket?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-300 text-xs tracking-widest uppercase block mb-2 drop-shadow-lg">Mission</span>
                  <p className="font-light text-white text-md md:text-lg tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{launch.mission?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-300 text-xs tracking-widest uppercase block mb-2 drop-shadow-lg">Location</span>
                  <p className="font-light text-white text-md md:text-lg tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{launch.pad?.location || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-300 text-xs tracking-widest uppercase block mb-2 drop-shadow-lg">Provider</span>
                  <p className="font-light text-white text-md md:text-lg tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{launch.provider || 'N/A'}</p>
                </div>
              </div>

              {/* Mission Description */}
              {launch.mission?.description && (
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-xl font-bold mb-4 tracking-wide uppercase" style={{ color: '#18BBF7', textShadow: '0 0 20px rgba(24, 187, 247, 0.5)' }}>
                    Mission Description
                  </h2>
                  <div className="h-px w-20 mx-auto mb-6" style={{ backgroundColor: '#FF6B35', boxShadow: '0 0 15px rgba(255, 107, 53, 0.8)' }}></div>
                  <p className="text-gray-200 font-light drop-shadow-lg text-md md:text-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    {launch.mission.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Streams Section */}
      <div className="bg-black border-t-2" style={{ borderColor: '#18BBF7' }}>
        <div className="container mx-auto py-16 px-8">
          {/* Header */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-wide" style={{ color: '#FF6B35' }}>
              Upcoming Streams
            </h2>
            {streams.length > 0 && (
              <p className="text-gray-400 text-sm mt-2">
                {streams.length} stream{streams.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>

          {/* Stream Grid */}
          {streams.length > 0 && <StreamGrid streams={streams} />}

          {/* No Streams Message */}
          {streams.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                No live streams available for this launch yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaunchDetail;