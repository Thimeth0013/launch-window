import { useState, useEffect } from 'react';
import { fetchLaunches } from '../services/api';
import LaunchCard from '../components/LaunchCard';
import Particles from '../components/Particles';
import { Loader2, Search } from 'lucide-react';

const Home = () => {
  const [launches, setLaunches] = useState([]);
  const [filteredLaunches, setFilteredLaunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLaunches();
  }, []);

  const loadLaunches = async () => {
    try {
      setLoading(true);
      const data = await fetchLaunches(20);
      setLaunches(data);
      setFilteredLaunches(data);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 animate-spin" style={{ color: '#18BBF7' }} />
          <span className="mt-6 text-2xl font-light tracking-widest uppercase">Loading launches</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="border-4 border-red-600 px-12 py-8">
          <div className="text-red-500 text-xl font-light tracking-wide">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Background Particles */}
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

      {/* Foreground Content */}
      <div className="relative z-10">
        <header
          className="border-b-2 py-6 bg-transparent text-center"
          style={{ borderColor: '#18BBF7' }}
        >
          <div className="container mx-auto">
            <h1
              className="text-5xl font-bold mb-2"
              style={{ color: '#18BBF7' }}
            >
              LAUNCH WINDOW
            </h1>
            <p className="text-white text-lg font-light tracking-wide">
              Explore launch schedules and live mission streams
            </p>
          </div>
        </header>

        <main className="container mx-auto px-8 py-16">
          <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <h2
              className="text-3xl font-bold tracking-wide"
              style={{ color: '#FF6B35' }}
            >
              Upcoming Launches
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
                <LaunchCard key={launch.id} launch={launch} />
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
