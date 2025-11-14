import { useState, useEffect } from 'react';
import { fetchLaunches } from '../services/api';
import axios from 'axios';
import LaunchCard from '../components/LaunchCard';
import Particles from '../components/Particles';
import { Loader2, Search } from 'lucide-react';
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

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  useEffect(() => {
    loadLaunches();
  }, []);

  const loadLaunches = async () => {
    try {
      setLoading(true);
      const data = await fetchLaunches(20);
      setLaunches(data);
      setFilteredLaunches(data);

      const counts = {};
      await Promise.all(
        data.map(async (launch) => {
          try {
            const API_BASE_URL =
              import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await axios.get(
              `${API_BASE_URL}/streams/launch/${launch.id}`
            );
            counts[launch.id] = response.data?.length || 0;
          } catch {
            counts[launch.id] = 0;
          }
        })
      );
      setStreamCounts(counts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredLaunches(launches);
      return;
    }

    const filtered = launches.filter((launch) => {
      const company = launch.provider?.name?.toLowerCase() || '';
      const rocketName = launch.name?.toLowerCase() || '';
      const location = launch.pad?.location?.name?.toLowerCase() || '';

      return (
        company.includes(query) ||
        rocketName.includes(query) ||
        location.includes(query)
      );
    });

    setFilteredLaunches(filtered);
  }, [searchQuery, launches]);

  // --- Navbar scroll behavior ---
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide navbar when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }

      // Make navbar solid black after scrolling 60px
      setNavbarSolid(currentScrollY > 60);

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 animate-spin" style={{ color: '#18BBF7' }} />
          <span className="mt-6 text-2xl font-light tracking-widest uppercase">
            Loading launches
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="border-4 border-red-600 px-12 py-8">
          <div className="text-red-500 text-xl font-light tracking-wide">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Particles
          particleColors={['#ffffff', '#ffffff']}
          particleCount={1000}
          particleSpread={10}
          speed={0.08}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
        />
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <header
          className={`fixed w-full top-0 left-0 transition-all z-1000 ${
            showNavbar ? 'translate-y-0' : '-translate-y-full'
          } ${navbarSolid ? 'bg-black' : 'bg-transparent'} border-b`}
          style={{ borderColor: '#18BBF7' }}
        >
          <div className="container mx-auto flex items-center justify-between px-8 py-3">
            <div className="flex items-center gap-2 md:gap-2 pt-1 pb-1 group">
              <img
                src={logo}
                alt="logo"
                className="md:h-10 h-8 transition-transform duration-600 group-hover:rotate-y-180"
                style={{ transformStyle: 'preserve-3d' }}
              />
              <h1 className="text-lg md:text-2xl font-bold text-[#18BBF7]">
                LAUNCH WINDOW
              </h1>
            </div>

            <div className="text-[#18BBF7] font-mono text-right tracking-widest text-xs md:text-sm">
              <div>
                {formattedTime} | {formattedDate.toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-8 py-6 md:py-28">
          <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <h2
              className="text-xl md:text-2xl font-bold tracking-wide"
              style={{ color: '#FF6B35' }}
            >
              UPCOMING LAUNCHES
            </h2>

            <div className="relative max-w-md w-full group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#FF6B35]" />
              <input
                type="text"
                placeholder="Search by rocket or mission..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2 bg-black/20 focus:bg-black border border-gray-700 hover:border-gray-500 focus:outline-none focus:border-[#FF6B35]/80 transition-colors placeholder-gray-500"
              />
            </div>
          </div>

          {filteredLaunches.length === 0 ? (
            <div className="text-center py-24">
              <div
                className="border-2 inline-block px-16 py-12 bg-black/70 backdrop-blur-sm"
                style={{ borderColor: '#18BBF7' }}
              >
                <p className="text-white text-xl font-light tracking-widest uppercase">
                  {searchQuery
                    ? 'No launches match your search'
                    : 'No upcoming launches found'}
                </p>
                <p className="text-gray-400 mt-4 text-sm tracking-wider">
                  {searchQuery ? 'Try a different keyword' : 'Check back later'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredLaunches.map((launch) => (
                <LaunchCard
                  key={launch.id}
                  launch={launch}
                  streamCount={streamCounts[launch.id] || 0}
                />
              ))}
            </div>
          )}
        </main>

        <footer
          className="border-t-2 py-8 mt-16 bg-transparent"
          style={{ borderColor: '#18BBF7' }}
        >
          <div className="container mx-auto px-8 text-center">
            <p className="text-gray-400 text-sm tracking-widest uppercase font-light">
              Launch Window © 2025
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;