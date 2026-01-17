import { useEffect, useState, memo } from 'react';
import { Youtube, MonitorPlay } from 'lucide-react';

const StreamCard = memo(({ stream }) => {
  const [isActive, setIsActive] = useState(false);

  // UTC Check logic
  const isStreamLive = (scheduledStartTime) => {
    const now = new Date().getTime();
    const start = new Date(scheduledStartTime).getTime();
    return now >= start;
  };

  useEffect(() => {
    setIsActive(isStreamLive(stream.scheduledStartTime));
    const interval = setInterval(() => {
      setIsActive(isStreamLive(stream.scheduledStartTime));
    }, 30000);
    return () => clearInterval(interval);
  }, [stream.scheduledStartTime]);

  const getEmbedUrl = (stream) => {
    if (stream.platform === 'youtube') {
      return `https://www.youtube.com/embed/${stream.streamId}?autoplay=0&rel=0&modestbranding=1`;
    }
    return null;
  };

  const embedUrl = getEmbedUrl(stream);
  const isYouTube = stream.platform === 'youtube';

  return (
    <div className="group h-full flex flex-col bg-black border-2 border-[#18BBF7]/30 hover:border-[#18BBF7] transition-all duration-200">
    
      {/* Video/Thumbnail Section */}
      <div className="relative aspect-video bg-black overflow-hidden">
        {isYouTube && embedUrl ? (
          <iframe
            src={embedUrl}
            title={stream.title}
            className="w-full h-full grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="relative h-full w-full">
            <img
              src={stream.thumbnailUrl || '/placeholder-stream.jpg'}
              alt={stream.title}
              className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 border-2 border-[#18BBF7] bg-black/80 text-[#18BBF7] font-black tracking-widest uppercase text-xs">
                Signal Offline
              </div>
            </div>
          </div>
        )}
        
        {/* Hard Edge Accent */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#FF6B35] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col bg-white/[0.02]">
        <h4 className="text-md font-black mb-3 tracking-tight uppercase text-white leading-tight line-clamp-2 min-h-[2.5rem]">
          {stream.title}
        </h4>
        
        <div className="mt-auto pt-3 border-t border-[#18BBF7]/20 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 text-[#18BBF7]/70">
              {stream.platform === 'youtube' ? <Youtube size={16} /> : <MonitorPlay size={16} />}
            </div>
            <span className="text-gray-400 text-[10px] font-bold tracking-widest uppercase truncate max-w-[120px]">
              {stream.channelName || 'Unknown Source'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

StreamCard.displayName = 'StreamCard';

const StreamGrid = ({ streams }) => {
  if (!streams || streams.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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