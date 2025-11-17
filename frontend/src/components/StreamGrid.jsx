import { useEffect, useState, memo } from 'react';
import { Play, Youtube } from 'lucide-react';

// Separate component for each stream card to properly use hooks
const StreamCard = memo(({ stream }) => {
  const [isActive, setIsActive] = useState(false);

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

  // Check if stream is live on mount and every 30 seconds
  useEffect(() => {
    // Initial check
    setIsActive(isStreamLive(stream.scheduledStartTime));

    // Set up interval for periodic checks
    const interval = setInterval(() => {
      setIsActive(isStreamLive(stream.scheduledStartTime));
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [stream.scheduledStartTime]);

  const handleWatchNow = () => {
    if (isActive) {
      window.open(stream.url, '_blank', 'noopener,noreferrer');
    }
  };

  const embedUrl = getEmbedUrl(stream);
  const isYouTube = stream.platform === 'youtube';

  return (
    <div className="group h-full block transition-all duration-300">
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
              loading="lazy"
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
          <h4 className="text-md font-bold mb-1 tracking-wide uppercase text-white group-hover:text-[#18BBF7] transition-colors line-clamp-2">
            {stream.title}
          </h4>
          <div className="h-px my-2" style={{ backgroundColor: '#18BBF7', opacity: 0.3 }} />
          <p className="text-white text-xs tracking-wider font-light flex items-center gap-2 uppercase">
            {getPlatformIcon(stream.platform)}
            {stream.channelName || 'Unknown Channel'}
          </p>
        </div>
      </div>
    </div>
  );
});

StreamCard.displayName = 'StreamCard';

const StreamGrid = ({ streams }) => {
  if (!streams || streams.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {streams.map((stream) => (
        <StreamCard 
          key={stream.streamId || stream._id} 
          stream={stream} 
        />
      ))}
    </div>
  );
};

export default StreamGrid;