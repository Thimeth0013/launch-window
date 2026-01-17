import { Link } from 'react-router-dom';
import { Video, MapPin, Rocket } from 'lucide-react';

const LaunchCard = ({ launch, streamCount = 0 }) => {
  const launchDate = new Date(launch.date);
  
  return (
    <Link 
      to={`/launch/${launch.id}`} 
      className="block group h-full"
    >
      <div 
        className="bg-transparent backdrop-blur-xs border-2 overflow-hidden transition-all duration-300 h-full flex flex-col border-[#18BBF7]/40 hover:border-[#18BBF7]" 
      >
        {launch.image && (
          <div className="relative overflow-hidden">
            <img 
              src={launch.image} 
              alt={launch.name}
              className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Animated Orange Line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#FF6B35] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            
            {streamCount > 0 && (
              <div className="absolute top-2 right-2 bg-[#FF6B35] text-white px-2 py-1 flex items-center gap-1 text-xs font-bold tracking-wide">
                <Video className="w-3 h-3" />
                <span>{streamCount}</span>
              </div>
            )}
          </div>
        )}

        <div className="p-4 flex-1 flex flex-col">
          <h3 
            className="text-lg font-bold mb-2 tracking-wide uppercase text-white group-hover:text-[#18BBF7] transition-colors line-clamp-2" 
            style={{ minHeight: '2.5rem' }}
          >
            {launch.name}
          </h3>
          
          <div className="space-y-1 mb-3 flex-1">
            {/* Provider with Icon */}
            <div className="flex items-center gap-1.5">
              <Rocket className="w-3 h-3 text-white" />
              <p className="text-white text-xs tracking-wider uppercase font-light">
                {launch.provider}
              </p>
            </div>

            {/* Location with Icon */}
            <div className="flex items-start gap-1.5 mt-2">
              <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
              <p className="text-gray-400 text-xs tracking-widest uppercase line-clamp-2" style={{ fontSize: '0.65rem' }}>
                {launch.pad?.location || 'Unknown Location'}
              </p>
            </div>
          </div>

          <div 
            className="h-px my-2" 
            style={{ backgroundColor: '#18BBF7', opacity: 0.3 }}
          ></div>
          
          <div className="flex justify-between items-center gap-2">
            <div className="text-xs text-white tracking-wider uppercase font-light" style={{ fontSize: '0.65rem' }}>
              <div>{launchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div className="mt-0.5" style={{ color: '#18BBF7' }}>
                {launchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div
                className={`px-2 py-1 border text-xs tracking-widest uppercase font-bold ${
                  launch.status === 'Go for Launch' || launch.status === 'Go'
                    ? 'border-green-500 text-green-400'
                    : launch.status === 'To Be Confirmed' || launch.status === 'TBC'
                    ? 'border-yellow-500 text-yellow-400'
                    : launch.status === 'To Be Determined' || launch.status === 'TBD'
                    ? 'border-gray-500 text-gray-400'
                    : 'border-yellow-500 text-yellow-400'
                }`}
                style={{ fontSize: '0.6rem' }}
              >
                {launch.status}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LaunchCard;