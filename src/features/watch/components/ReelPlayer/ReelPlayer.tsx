import { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { Reel, ReelComment } from '../../types/watch.types';
import { ReelOverlay } from '../ReelOverlay';
import { ReelInteractionPanel } from '../ReelInteractionPanel';
import { CommentsPanel } from '../CommentsPanel';
import { ReelNavigation } from '../ReelNavigation';

interface ReelPlayerProps {
  reel: Reel;
  comments: ReelComment[];
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const ReelPlayer = ({ 
  reel, 
  comments, 
  onPrevious, 
  onNext, 
  hasPrevious, 
  hasNext 
}: ReelPlayerProps) => {
  const videoRef = useRef<HTMLImageElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleLike = () => {
    console.log('Like reel:', reel.id);
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const handleShare = () => {
    console.log('Share reel:', reel.id);
  };

  const handleMore = () => {
    console.log('More options for reel:', reel.id);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const togglePlay = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="flex items-center justify-center h-full px-8 relative">
      <div className="flex items-center gap-6">
        {/* Video Container */}
        <div className="relative w-full max-w-[500px] h-[calc(100vh-120px)] bg-black rounded-lg overflow-hidden group flex-shrink-0">
          {/* Video (using image as placeholder since we don't have actual video) */}
          <img
            ref={videoRef}
            src={reel.videoUrl}
            alt={reel.caption}
            className="w-full h-full object-contain"
          />

          {/* Play/Pause Overlay */}
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
          >
            {isPaused && (
              <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
            )}
          </div>

          {/* Volume Control */}
          <button
            onClick={toggleMute}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Bottom Overlay with Creator Info */}
          <ReelOverlay
            creator={reel.creator}
            caption={reel.caption}
            music={reel.music}
          />
        </div>

        {/* Interaction Buttons - Always next to video */}
        <div className="flex-shrink-0 flex items-center">
          <ReelInteractionPanel
            likes={reel.likes}
            comments={reel.comments}
            shares={reel.shares}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onMore={handleMore}
          />
        </div>

        {/* Navigation Buttons - Between interaction and comments when comments are open */}
        {showComments && (
          <div className="flex-shrink-0 flex items-center">
            <ReelNavigation
              onPrevious={onPrevious}
              onNext={onNext}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
            />
          </div>
        )}

        {/* Comments Panel - Far right when open */}
        {showComments && (
          <div className="flex-shrink-0 h-[calc(100vh-120px)]">
            <CommentsPanel comments={comments} onClose={() => setShowComments(false)} />
          </div>
        )}
      </div>

      {/* Navigation Buttons - Far right when comments are closed */}
      {!showComments && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-10">
          <ReelNavigation
            onPrevious={onPrevious}
            onNext={onNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
        </div>
      )}
    </div>
  );
};