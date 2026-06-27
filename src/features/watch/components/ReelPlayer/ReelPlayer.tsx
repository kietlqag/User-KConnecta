import { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { Reel, ReelComment } from '../../types/watch.types';
import { ReelOverlay } from '../ReelOverlay';
import { ReelInteractionPanel } from '../ReelInteractionPanel';
import { CommentsPanel } from '../CommentsPanel';
import { PostShareModal } from '@/components/posts/PostShareModal';
import { authService } from '@/services/authService';
import { interestService } from '@/services/interestService';
import { postService, SAVED_POSTS_CHANGED_EVENT, type ReactionType } from '@/services/postService';
import { reactions, type ReactionOption } from '@/components/reactions';
import { toast } from 'sonner';

interface ReelPlayerProps {
  reel: Reel;
  isActive?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const ReelPlayer = ({
  reel,
  isActive = true,
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
  const viewRecordedRef = useRef(false);

  useEffect(() => {
    viewRecordedRef.current = false;
  }, [reel.id]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (viewRecordedRef.current) {
        return;
      }
      viewRecordedRef.current = true;
      void interestService.recordEvent(reel.id, 'VIEW').catch(() => undefined);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [isActive, reel.id]);

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
    setProgress(0);
    setDuration(0);
    setIsPaused(false);
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
    <div className="flex h-full items-center justify-center overflow-hidden px-6">
      <div
        className={`flex items-center gap-5 will-change-transform ${ showComments ? '-translate-x-[212px]' : 'translate-x-0' }`}
      >
        <div className="relative h-[calc(100vh-120px)] w-[500px] max-w-[calc(100vw-8rem)] shrink-0 overflow-hidden rounded-xl bg-black shadow-[0_8px_40px_rgba(0,0,0,0.18)] group">
          <video
            key={reel.id}
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
                className="w-20 h-1 bg-card/30 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-card [&::-webkit-slider-thumb]:rounded-full"
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
            postedAt={reel.postedAt}
            privacy={reel.privacy}
            group={reel.group}
            music={reel.music}
          />

          {/* Progress Bar Scrubber */}
          <div className="absolute bottom-0 left-0 right-0 z-20 flex h-4 items-end px-0 pb-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="any"
              value={progress}
              onChange={handleSeek}
              className="h-1 w-full cursor-pointer appearance-none bg-card/30 outline-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-card"
              style={{
                background: `linear-gradient(to right, #10b981 ${(progress / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(progress / (duration || 1)) * 100}%)`
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <div className="flex-shrink-0 self-center">
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
            onPrevious={onPrevious}
            onNext={onNext}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
        </div>
      </div>

      {/* Comments Panel - Fixed full-height right corner */}
      {showComments && (
        <div data-reel-comments className="fixed right-0 top-14 h-[calc(100vh-56px)] z-20">
          <CommentsPanel
            postId={reel.id}
            creator={reel.creator}
            caption={reel.caption}
            postedAt={reel.postedAt}
            onClose={() => setShowComments(false)}
            onCommentCountChange={(delta) => {
              setCommentCount(prev => prev + delta);
            }}
          />
        </div>
      )}

      <PostShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        postId={reel.id}
        postContent={reel.caption}
        postImage={reel.thumbnail}
        postAuthorName={reel.creator.name}
        linkStyle="watch"
        onShareComplete={(response) => setShareCount(response.shareCount)}
      />
    </div>
  );
};
