import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLaunchById, fetchStreamsForLaunch } from '../services/api';
import Countdown from '../components/Countdown';
import StreamGrid from '../components/StreamGrid';
import { ChevronLeft, Loader2 } from 'lucide-react';

const LaunchDetail = () => {
  const { id } = useParams();
  const [launch, setLaunch] = useState(null);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 animate-spin" style={{ color: '#18BBF7' }} />
          <span className="mt-6 text-2xl font-light tracking-widest uppercase">Loading launch details</span>
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
            <div className="container mx-10">
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-white/90 hover:text-[#FF6B35] transition-all group"
              >
                <ChevronLeft className="w-8 h-8 transition-transform group-hover:-translate-x-1  bg-white/10 backdrop-blur-md rounded-md hover:bg-white" />
              </Link>
            </div>
          </header>

          {/* Main Content - Vertically Centered */}
          <div className="flex-1 flex items-center justify-center py-12 pt-6">
            <div className="container mx-auto px-8 text-center">
              {/* Launch Title */}
              <h1 className="text-6xl md:text-7xl font-bold tracking-wide uppercase mb-6 drop-shadow-2xl" style={{ color: '#ffffff', textShadow: '0 0 40px rgba(255, 255, 255, 0.5)' }}>
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
                  <p className="font-light text-white text-lg tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{launch.rocket?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-300 text-xs tracking-widest uppercase block mb-2 drop-shadow-lg">Mission</span>
                  <p className="font-light text-white text-lg tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{launch.mission?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-300 text-xs tracking-widest uppercase block mb-2 drop-shadow-lg">Location</span>
                  <p className="font-light text-white text-lg tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{launch.pad?.location || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-300 text-xs tracking-widest uppercase block mb-2 drop-shadow-lg">Provider</span>
                  <p className="font-light text-white text-lg tracking-wide drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{launch.provider || 'N/A'}</p>
                </div>
              </div>

              {/* Mission Description */}
              {launch.mission?.description && (
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-xl font-bold mb-4 tracking-wide uppercase" style={{ color: '#18BBF7', textShadow: '0 0 20px rgba(24, 187, 247, 0.5)' }}>
                    Mission Description
                  </h2>
                  <div className="h-px w-20 mx-auto mb-6" style={{ backgroundColor: '#FF6B35', boxShadow: '0 0 15px rgba(255, 107, 53, 0.8)' }}></div>
                  <p className="text-gray-200 font-light drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
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
        <div className="container mx-auto py-16">
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-wide mb-2" style={{ color: '#FF6B35' }}>
              Live Streams
            </h2>
          </div>
          <StreamGrid streams={streams} />
        </div>
      </div>
    </div>
  );
};

export default LaunchDetail;