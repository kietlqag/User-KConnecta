import React, { useCallback, useEffect, useState } from 'react';
import { X, MessageCircle, Share2, Globe, Users, Lock } from 'lucide-react';
import { PostShareModal } from './PostShareModal';
import {
  getActiveReactions,
  getTotalReactionCount,
  ReactionButton,
  type ReactionCountMap,
  type ReactionOption,
} from '@/components/reactions';
import { CommentSection } from './CommentSection';
import { PostMoreMenu } from '../shared/PostMoreMenu';
import { PostMediaGallery } from '../shared/PostMediaGallery';
import type { PostGalleryItem } from '../shared/PostMediaGallery';

type Privacy = 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE';

const PRIVACY_ICON: Record<Privacy, React.ReactNode> = {
  PUBLIC:         <Globe className="w-3.5 h-3.5" />,
  FRIENDS:        <Users className="w-3.5 h-3.5" />,
  FRIENDS_EXCEPT: <Users className="w-3.5 h-3.5" />,
  PRIVATE:        <Lock className="w-3.5 h-3.5" />,
};

const PRIVACY_LABEL: Record<Privacy, string> = {
  PUBLIC:         'Công khai',
  FRIENDS:        'Bạn bè',
  FRIENDS_EXCEPT: 'Bạn bè trừ...',
  PRIVATE:        'Chỉ mình tôi',
};

interface Post {
  id: string;
  author: {
    id?: string;
    name: string;
    avatar: string;
    status?: string;
  };
  content: string;
  timestamp: string;
  likes?: number;
  comments?: number;
  shares?: number;
  image?: string;
  media?: { type: 'image' | 'video'; url: string };
  mediaList?: PostGalleryItem[];
  reactionCounts?: ReactionCountMap;
  privacy?: Privacy;
  isOwner?: boolean;
  currentUserId?: string;
}

interface PostDetailModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentCountChange?: (count: number) => void;
  onShareAdded?: (newShareCount: number) => void;
  selectedReaction?: ReactionOption | null;
  onReactionChange?: (reaction: ReactionOption | null) => void;
  isReacting?: boolean;
  onPrivacyChange?: (privacy: Privacy) => void;
}

export function PostDetailModal({
  post,
  isOpen,
  onClose,
  onCommentAdded,
  onCommentCountChange,
  onShareAdded,
  selectedReaction = null,
  onReactionChange,
  isReacting = false,
  onPrivacyChange,
}: PostDetailModalProps) {
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const [shareCount, setShareCount] = useState(post.shares || 0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [privacy, setPrivacy] = useState<Privacy>(post.privacy ?? 'PUBLIC');

  const reactionCounts = post.reactionCounts || {
    LIKE: post.likes || 0,
    LOVE: 0,
    HAHA: 0,
    WOW: 0,
    SAD: 0,
    ANGRY: 0,
  };
  const activeReactions = getActiveReactions(reactionCounts);
  const totalReactionCount = getTotalReactionCount(reactionCounts);

  useEffect(() => {
    setCommentCount(post.comments || 0);
    setShareCount(post.shares || 0);
    setPrivacy(post.privacy ?? 'PUBLIC');
  }, [post.comments, post.shares, post.id, post.privacy]);

  const handleCommentAdded = useCallback(() => {
    setCommentCount((prev) => {
      const nextCount = prev + 1;
      onCommentCountChange?.(nextCount);
      return nextCount;
    });
    onCommentAdded?.();
  }, [onCommentAdded, onCommentCountChange]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold">Bài viết của {post.author.name}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 transition-colors hover:bg-gray-300 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-3 pt-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold">{post.author.name}</h3>
                    {post.author.status && (
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-gray-600">{post.author.status}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>{post.timestamp}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5" title={PRIVACY_LABEL[privacy]}>
                      {PRIVACY_ICON[privacy]}
                    </span>
                  </div>
                </div>
              </div>
              <PostMoreMenu
                postId={post.id}
                isOwner={post.isOwner}
                privacy={privacy}
                currentUserId={post.currentUserId}
                onPrivacyChange={(p) => {
                  setPrivacy(p);
                  onPrivacyChange?.(p);
                }}
              />
            </div>
          </div>

          <div className="px-4 pb-3">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>
          </div>

          {post.mediaList && post.mediaList.length >= 2 ? (
            <div className="mb-3 px-4">
              <PostMediaGallery items={post.mediaList} className="max-h-[min(560px,75vh)]" />
            </div>
          ) : post.media ? (
            <div className="mb-3 flex justify-center bg-black">
              {post.media.type === 'video' ? (
                <video src={post.media.url} controls className="max-h-[500px] w-full object-contain" />
              ) : (
                <img src={post.media.url} alt="Post content" className="max-h-[500px] w-full object-contain" />
              )}
            </div>
          ) : post.image ? (
            <div className="mb-3 flex justify-center bg-black">
              <img src={post.image} alt="Post content" className="max-h-[500px] w-full object-contain" />
            </div>
          ) : null}

          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              {totalReactionCount > 0 && (
                <>
                  <div className="flex items-center -space-x-1">
                    {activeReactions.slice(0, 3).map((reaction) => (
                      <span
                        key={reaction.type}
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white text-sm leading-none"
                      >
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>
                  <span className="ml-1">{totalReactionCount}</span>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <span>{commentCount} bình luận</span>
              <span>{shareCount} chia sẻ</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 border-b border-gray-200 px-4 py-1">
            <ReactionButton
              initialReaction={selectedReaction}
              onReactionChange={onReactionChange}
              disabled={isReacting}
              buttonClassName="cursor-pointer disabled:cursor-not-allowed"
            />

            <button className="flex items-center justify-center gap-2 rounded-md py-2 transition-colors hover:bg-gray-100 cursor-pointer">
              <MessageCircle className="h-5 w-5 text-gray-600" />
              <span className="text-[15px] font-semibold text-gray-600">Bình luận</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-md py-2 transition-colors hover:bg-gray-100 cursor-pointer"
            >
              <Share2 className="h-5 w-5 text-gray-600" />
              <span className="text-[15px] font-semibold text-gray-600">Chia sẻ</span>
            </button>
          </div>

          <CommentSection
            postId={post.id}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      </div>

      <PostShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        postId={post.id}
        postContent={post.content}
        postImage={post.image}
        onShareComplete={(count) => {
          setShareCount(count);
          onShareAdded?.(count);
        }}
      />
    </div>
  );
}
