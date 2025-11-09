import { Youtube, Play, Users, Globe } from 'lucide-react';

const StreamGrid = ({ streams }) => {
  if (!streams || streams.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No streams found yet. Check back closer to launch time!
      </div>
    );
  }

  const getEmbedUrl = (stream) => {
    if (stream.platform === 'youtube') {
      return `https://www.youtube.com/embed/${stream.streamId}`;
    }
    return stream.url;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {streams.map((stream) => (
        <div key={stream._id} className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="aspect-video">
            <iframe
              src={getEmbedUrl(stream)}
              title={stream.title}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
            <div className="p-4">
              <h4 className="font-semibold mb-1 flex items-center gap-2">
                <Play className="w-4 h-4" />
                {stream.title}
              </h4>
              <p className="text-sm text-gray-400 flex items-center gap-1">
                <Youtube className="w-4 h-4" />
                {stream.channelName}
              </p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-blue-600 px-2 py-1 rounded flex items-center gap-1">
                  {stream.platform}
                </span>
                {stream.language && (
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {stream.language.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
        </div>
      ))}
    </div>
  );
};

export default StreamGrid;