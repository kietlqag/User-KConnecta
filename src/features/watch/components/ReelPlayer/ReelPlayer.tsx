import { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { Reel, ReelComment } from '../../types/watch.types';
import { ReelOverlay } from '../ReelOverlay';
import { ReelInteractionPanel } from '../ReelInteractionPanel';
import { CommentsPanel } from '../CommentsPanel';
import { ShareModal } from '../ShareModal/ShareModal';
import { ReelNavigation } from '../ReelNavigation';
import { authService } from '@/services/authService';
import { postService, SAVED_POSTS_CHANGED_EVENT, type ReactionType } from '@/services/postService';
import { reactions, type ReactionOption } from '@/components/reactions';
import { toast } from 'sonner';

interface ReelPlayerProps {
  reel: Reel;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const ReelPlayer = ({ 
  reel, 
  onPrevious, 
  onNext, 
  hasPrevious, 
  hasNext 
}: ReelPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const [likeCount, setLikeCount] = useState(reel.likes);
  const [selectedReaction, setSelectedReaction] = useState<ReactionOption | null>(
    reel.currentUserReactionType
      ? reactions.find((item) => item.type === reel.currentUserReactionType) ?? null
      : null,
  );
  const [isReacting, setIsReacting] = useState(false);
  const [shareCount, setShareCount] = useState(reel.shares);
  const [commentCount, setCommentCount] = useState(reel.comments);
  const [isSaved, setIsSaved] = useState(reel.isSaved ?? false);

  useEffect(() => {
    setLikeCount(reel.likes);
    setSelectedReaction(
      reel.currentUserReactionType
        ? reactions.find((item) => item.type === reel.currentUserReactionType) ?? null
        : null,
    );
    setShareCount(reel.shares);
    setCommentCount(reel.comments);
    setIsSaved(reel.isSaved ?? false);
  }, [reel]);

  useEffect(() => {
    const onSavedChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: string; saved: boolean }>).detail;
      if (detail?.postId === reel.id) {
        setIsSaved(detail.saved);
      }
    };
    window.addEventListener(SAVED_POSTS_CHANGED_EVENT, onSavedChanged);
    return () => window.removeEventListener(SAVED_POSTS_CHANGED_EVENT, onSavedChanged);
  }, [reel.id]);

  useEffect(() => {
    setIsMuted(true);
  }, [reel.id]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleReactionChange = async (reaction: ReactionOption | null) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để thả cảm xúc');
      return;
    }

    try {
      setIsReacting(true);
      if (!reaction) {
        if (!selectedReaction) return;
        await postService.removeReaction(reel.id, currentUser.id);
        setSelectedReaction(null);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await postService.addReaction(reel.id, {
          userId: currentUser.id,
          reactionType: reaction.type as ReactionType,
        });
        if (!selectedReaction) {
          setLikeCount((prev) => prev + 1);
        }
        setSelectedReaction(reaction);
      }
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsReacting(false);
    }
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const performShare = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để chia sẻ');
      return;
    }

    try {
      await postService.sharePost(reel.id, { userId: currentUser.id });
      setShareCount(prev => prev + 1);
      toast.success('Đã chia sẻ bài viết');
    } catch (error) {
      toast.error('Không thể chia sẻ bài viết');
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
    setIsPaused(!isPaused);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;

      const activeElement = document.activeElement as HTMLElement | null;
      const isTyping =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      if (isTyping) return;

      e.preventDefault();
      togglePlay();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlay = () => setIsPaused(false);
  const handlePause = () => setIsPaused(true);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  return (
    <div className="flex items-center justify-center h-full px-8 relative">
      <div className="flex items-center gap-6">
        {/* Video Container */}
        <div className="relative w-full max-w-[500px] h-[calc(100vh-120px)] bg-black rounded-lg overflow-hidden group flex-shrink-0">
          <video
            ref={videoRef}
            src={reel.videoUrl}
            className="w-full h-full object-contain"
            autoPlay
            loop
            muted={isMuted}
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={handlePlay}
            onPause={handlePause}
          />

          {/* Play/Pause Overlay */}
          <div 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${isPaused ? 'opacity-100' : 'opacity-0'}`}
          >
            {isPaused && (
              <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div 
            className="absolute top-4 right-4 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            {showVolumeSlider && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/30 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <button
              onClick={toggleMute}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Bottom Overlay with Creator Info */}
          <ReelOverlay
            creator={reel.creator}
            caption={reel.caption}
            music={reel.music}
          />

          {/* Progress Bar Scrubber */}
          <div className="absolute bottom-0 left-0 right-0 h-4 z-20 flex items-end pb-1 px-0 group/progress">
            {/* Time Indicator */}
            <div className="absolute bottom-4 left-4 text-white text-xs font-semibold drop-shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none bg-black/40 px-2 py-1 rounded">
              {formatTime(progress)} / {formatTime(duration)}
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="any"
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 bg-white/30 appearance-none outline-none cursor-pointer group-hover/progress:h-2 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 group-hover/progress:[&::-webkit-slider-thumb]:w-3 group-hover/progress:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              style={{
                background: `linear-gradient(to right, #10b981 ${(progress / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(progress / (duration || 1)) * 100}%)`
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Interaction Buttons - Always next to video */}
        <div className="flex-shrink-0 flex items-center">
          <ReelInteractionPanel
            postId={reel.id}
            likes={likeCount}
            comments={commentCount}
            shares={shareCount}
            selectedReaction={selectedReaction}
            onReactionChange={handleReactionChange}
            isReacting={isReacting}
            isSaved={isSaved}
            isOwner={authService.getCurrentUser()?.id === reel.creator.id}
            onComment={handleComment}
            onShare={handleShare}
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
            <CommentsPanel 
              postId={reel.id} 
              onClose={() => setShowComments(false)}
              onCommentCountChange={(delta) => {
                setCommentCount(prev => prev + delta);
              }} 
            />
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

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShare={performShare}
        reel={reel}
      />
    </div>
  );
};
