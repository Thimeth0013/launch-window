import { useState, useEffect } from 'react';
import { fetchLaunches } from '../services/api';
import axios from 'axios';
import LaunchCard from '../components/LaunchCard';
import Particles from '../components/Particles';
import LaunchChat from '../components/LaunchChat';
import MissionLoader from '../components/MissionLoader';
import { Search, MessageSquareCode } from 'lucide-react';
import logo from '../assets/logo.png';

const Home = () => {
  const [launches, setLaunches] = useState([]);
  const [filteredLaunches, setFilteredLaunches] = useState([]);
  const [streamCounts, setStreamCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [time, setTime] = useState(new Date());
  const [showNavbar, setShowNavbar] = useState(true);
  const [navbarSolid, setNavbarSolid] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });

  useEffect(() => {
    loadLaunches();
  }, []);

  const loadLaunches = async () => {
    try {
      setLoading(true);
      const data = await fetchLaunches(30);
      setLaunches(data);
      setFilteredLaunches(data);

      // Only fetch stream counts for launches within 3 days
      const now = new Date();
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      const counts = {};
      
      // Filter launches that are within 3 days
      const upcomingLaunches = data.filter(launch => {
        const launchDate = new Date(launch.date);
        const timeDiff = launchDate - now;
        return timeDiff > 0 && timeDiff <= THREE_DAYS_MS;
      });

      console.log(`🎯 [HOME] Fetching stream counts for ${upcomingLaunches.length} launches within 3 days (out of ${data.length} total)`);

      await Promise.all(
        upcomingLaunches.map(async (launch) => {
          try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${API_BASE_URL}/streams/launch/${launch.id}`);
            counts[launch.id] = response.data?.length || 0;
          } catch { 
            counts[launch.id] = 0; 
          }
        })
      );
      
      // Set count to 0 for launches outside the 3-day window
      data.forEach(launch => {
        if (!counts.hasOwnProperty(launch.id)) {
          counts[launch.id] = 0;
        }
      });
      
      setStreamCounts(counts);
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) { setFilteredLaunches(launches); return; }

    const filtered = launches.filter((launch) => {
      const company = launch.provider?.name?.toLowerCase() || '';
      const rocketName = launch.name?.toLowerCase() || '';
      const location = launch.pad?.location?.name?.toLowerCase() || '';
      return company.includes(query) || rocketName.includes(query) || location.includes(query);
    });
    setFilteredLaunches(filtered);
  }, [searchQuery, launches]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowNavbar(currentScrollY < lastScrollY || currentScrollY < 50);
      setNavbarSolid(currentScrollY > 60);
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return <MissionLoader message="Initialising Home Feeds" />;
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden font-mono">
      <div className="absolute inset-0 z-0">
        <Particles particleColors={['#ffffff', '#ffffff']} particleCount={300} speed={0.05} />
      </div>

      <div className="relative z-10">
        <header className={`fixed w-full top-0 left-0 transition-none z-1000 ${
          showNavbar ? 'translate-y-0' : '-translate-y-full'
        } ${navbarSolid ? 'bg-black/90 backdrop-blur-md' : 'bg-transparent'} border-b`} style={{ borderColor: '#18BBF7' }}>
          <div className="container mx-auto flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="logo" className="h-8" />
              <h1 className="text-xl font-black text-[#18BBF7] tracking-tighter">LAUNCH WINDOW</h1>
            </div>
            <div className="text-[#18BBF7] font-bold text-right tracking-[0.2em] text-[10px] md:text-xs">
              {formattedTime} | {formattedDate.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-8 py-32">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-l-4 border-[#FF6B35] pl-6">
            <div>
              <h2 className="text-xs font-bold tracking-[0.5em] text-[#FF6B35] mb-2 uppercase">Current Operations</h2>
              <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Upcoming Launches</h3>
            </div>

            <div className="relative max-w-sm w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#18BBF7]" />
              <input
                type="text"
                placeholder="FILTER BY VEHICLE / MISSION..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/40 border border-[#18BBF7]/30 focus:border-[#18BBF7] focus:outline-none uppercase text-[10px] tracking-widest transition-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredLaunches.map((launch) => (
              <div key={launch.id} className="transition-none hover:scale-[1.02] transform">
                <LaunchCard launch={launch} streamCount={streamCounts[launch.id] || 0} />
              </div>
            ))}
          </div>
        </main>

        {/* Chat Toggle Button */}
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 z-[1500] bg-[#18BBF7] text-black p-2 shadow-[0_0_20px_rgba(24,187,247,0.4)] hover:bg-white hover:scale-110 transition-none"
        >
          <MessageSquareCode size={28} />
        </button>

        {/* Chat Overlay Component */}
        <LaunchChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        <footer className="border-t border-white/10 py-12 bg-black/40 z-1000">
          <div className="container mx-auto px-10 flex justify-between items-center opacity-40">
            <span className="text-[10px] tracking-[0.4em] uppercase">Transmission End</span>
            <span className="text-[10px] tracking-[0.4em] uppercase">LW-V.2.0.0 © 2026</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;