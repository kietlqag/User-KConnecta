import React from 'react';
import { MoreHorizontal, X, Globe, ThumbsUp, MessageCircle, Share2, Send } from 'lucide-react';
import './GroupPostCard.css';

interface GroupPostCardProps {
  groupName: string;
  groupAvatar: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  content: string;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  sendCount?: number;
  topReactions?: string[]; // E.g. ['👍', '❤️', '😆']
}

export const GroupPostCard: React.FC<GroupPostCardProps> = ({
  groupName,
  groupAvatar,
  userName,
  userAvatar,
  timestamp,
  content,
  reactionCount,
  commentCount,
  shareCount,
  sendCount = 0,
  topReactions = ['👍', '😆', '😢']
}) => {
  return (
    <div className="fb-post-card">
      {/* Header */}
      <div className="fb-post-header">
        <div className="fb-post-author-info">
          <div className="fb-group-avatar-container">
            <img src={groupAvatar} alt={groupName} className="fb-group-avatar" />
            {userAvatar && (
              <img src={userAvatar} alt={userName} className="fb-user-avatar-mini" />
            )}
          </div>
          <div className="fb-header-text">
            <span className="fb-group-name">{groupName}</span>
            <div className="fb-meta-info">
              <span className="fb-user-name">{userName}</span>
              <span>•</span>
              <span>{timestamp}</span>
              <Globe size={12} className="fb-globe-icon" />
            </div>
          </div>
        </div>
        <div className="fb-header-actions">
          <button className="fb-action-btn" title="Tùy chọn">
            <MoreHorizontal size={20} />
          </button>
          <button className="fb-action-btn" title="Đóng">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="fb-post-content">
        {content}
      </div>

      {/* Footer Stats */}
      <div className="fb-post-footer">
        <div className="fb-interaction-stats">
          <div className="fb-reactions-stats">
            <div className="fb-reaction-icons">
               {/* In a real app, these would be styled emoji spans or images */}
               <div className="fb-reaction-icon bg-blue-500 flex items-center justify-center text-[10px]">👍</div>
               <div className="fb-reaction-icon bg-red-500 flex items-center justify-center text-[10px]">❤️</div>
               <div className="fb-reaction-icon bg-yellow-500 flex items-center justify-center text-[10px]">😆</div>
            </div>
            <span>{reactionCount}</span>
          </div>
          <div className="fb-other-stats">
            <span className="fb-stat-item">{commentCount} bình luận</span>
            <span className="fb-stat-item">{shareCount} chia sẻ</span>
            {sendCount > 0 && <span className="fb-stat-item">{sendCount} lượt gửi</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fb-action-buttons">
          <button className="fb-bottom-btn">
            <ThumbsUp />
            <span>Thích</span>
          </button>
          <button className="fb-bottom-btn">
            <MessageCircle />
            <span>Bình luận</span>
          </button>
          <button className="fb-bottom-btn">
            <Share2 />
            <span>Chia sẻ</span>
          </button>
          <button className="fb-bottom-btn">
            <Send />
            <span>Gửi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
