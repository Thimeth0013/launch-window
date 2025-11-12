import { useEffect, useState } from 'react';
import { Play, Youtube } from 'lucide-react';

const StreamGrid = ({ streams }) => {
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-5 h-5" />;
      default:
        return <Play className="w-5 h-5" />;
    }
  };

  const getEmbedUrl = (stream) => {
    if (stream.platform === 'youtube') {
      return `https://www.youtube.com/embed/${stream.streamId}?autoplay=0&rel=0`;
    }
    return null;
  };

  // Convert to UTC timestamp in ms
  const toUTC = (date) => new Date(date).getTime() - new Date().getTimezoneOffset() * 60000;

  const isStreamLive = (scheduledStartTime) => {
    const nowUTC = toUTC(new Date());
    const startUTC = toUTC(scheduledStartTime);
    return nowUTC >= startUTC;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {streams.map((stream) => {
        const embedUrl = getEmbedUrl(stream);
        const isYouTube = stream.platform === 'youtube';
        const [isActive, setIsActive] = useState(isStreamLive(stream.scheduledStartTime));

        useEffect(() => {
          const interval = setInterval(() => {
            setIsActive(isStreamLive(stream.scheduledStartTime));
          }, 30000);
          return () => clearInterval(interval);
        }, [stream.scheduledStartTime]);

        const handleWatchNow = () => {
          if (isActive) window.open(stream.url, '_blank', 'noopener,noreferrer');
        };

        return (
          <div
            key={stream._id}
            className="group h-full block transition-all duration-300"
          >
            <div className="bg-transparent backdrop-blur-xs border-2 overflow-hidden h-full flex flex-col border-[#18BBF7]/40 hover:border-[#18BBF7] transition-all duration-300">
              
              {/* Thumbnail / Embed */}
              <div className="relative overflow-hidden bg-black">
                {isYouTube && embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={stream.title}
                    className="w-full aspect-video"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="relative aspect-video bg-gradient-to-br from-[#18BBF7]/10 to-[#FF6B35]/10 flex items-center justify-center">
                    <img
                      src={stream.thumbnailUrl || '/placeholder-stream.jpg'}
                      alt={stream.title}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-16 h-16 text-[#18BBF7] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    </div>
                  </div>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: '#FF6B35' }}
                />
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h4 className="text-md font-bold mb-2 tracking-wide uppercase text-white group-hover:text-[#18BBF7] transition-colors line-clamp-2">
                  {stream.title}
                </h4>

                <p className="text-white text-xs tracking-wider font-light flex items-center gap-2 uppercase">
                  {getPlatformIcon(stream.platform)}
                  {stream.channelName || 'Unknown Channel'}
                </p>

                <div className="h-px my-3" style={{ backgroundColor: '#18BBF7', opacity: 0.3 }} />

                <button
                  onClick={handleWatchNow}
                  disabled={!isActive}
                  className={`w-full py-2 mt-auto text-sm font-semibold border-2 transition-colors ${
                    isActive
                      ? 'border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35] hover:text-black'
                      : 'border-gray-600 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Watch Now
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StreamGrid;
