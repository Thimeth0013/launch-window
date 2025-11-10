import { Link } from 'react-router-dom';
import { Youtube, Twitch, MessageCircle, Play, Users, Globe, ExternalLink } from 'lucide-react';

const StreamGrid = ({ streams }) => {
  
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube': return <Youtube className="w-5 h-5" />;
      case 'twitch': return <Twitch className="w-5 h-5" />;
      case 'twitter': return <MessageCircle className="w-5 h-5" />;
      default: return <Play className="w-5 h-5" />;
    }
  };

  const getEmbedUrl = (stream) => {
    if (stream.platform === 'youtube') {
      return `https://www.youtube.com/embed/${stream.streamId}?autoplay=0&rel=0`;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {streams.map((stream) => {
        const isYouTube = stream.platform === 'youtube';
        const embedUrl = getEmbedUrl(stream);

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
                    <a
                      href={stream.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0"
                      aria-label="Open stream"
                    />
                  </div>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: '#FF6B35' }}
                />
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h4 className="text-lg font-bold mb-2 tracking-wide uppercase text-white group-hover:text-[#18BBF7] transition-colors line-clamp-2">
                  {stream.title}
                </h4>

                <div className="space-y-2 mb-4 flex-1">
                  <p className="text-white text-xs tracking-wider font-light flex items-center gap-2 uppercase">
                    {getPlatformIcon(stream.platform)}
                    {stream.channelName || 'Unknown Channel'}
                  </p>
                </div>

                <div className="h-px my-3" style={{ backgroundColor: '#18BBF7', opacity: 0.3 }} />

                <div className="flex justify-between items-center text-xs">
                  <div className="flex gap-3">
                    {stream.language && (
                      <span className="flex items-center gap-1 text-gray-300 tracking-wider">
                        <Globe className="w-3.5 h-3.5" />
                        {stream.language.toUpperCase()}
                      </span>
                    )}
                    {stream.isLive && stream.viewerCount > 0 && (
                      <span className="flex items-center gap-1 text-red-400 font-bold">
                        <Users className="w-3.5 h-3.5" />
                        {stream.viewerCount.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {stream.isLive && (
                      <span className="flex items-center gap-1 text-red-500 animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        LIVE
                      </span>
                    )}
                    {!isYouTube && (
                      <a
                        href={stream.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#18BBF7] hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StreamGrid;