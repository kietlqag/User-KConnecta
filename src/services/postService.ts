import { api } from './api';

export const SAVED_POSTS_CHANGED_EVENT = 'saved-posts-changed';

export interface CreatePostMediaRequest {
  mediaType: 'IMAGE' | 'VIDEO';
  fileUrl: string;
  thumbnailUrl?: string;
  sortOrder?: number;
}

export interface CreatePostPayload {
  authorId: string;
  groupId?: string;
  content: string;
  imageUrl?: string;
  media?: CreatePostMediaRequest[];
  privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE';
  status: 'PUBLISHED' | 'SCHEDULED' | 'DRAFT';
  promoted?: boolean;
}

export interface CreateCommentPayload {
  userId: string;
  content: string;
  parentCommentId?: string;
}

export interface SharePostPayload {
  userId: string;
  sharedContent?: string;
}

export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export interface PostReactionCountResponse {
  reactionType: ReactionType;
  count: number;
}

export interface PostReactionUserResponse {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
  reactionType: ReactionType;
  reactedAt: string;
}

export interface PostReactionDetailsResponse {
  postId: string;
  totalCount: number;
  counts: PostReactionCountResponse[];
  reactions: PostReactionUserResponse[];
}

export interface PostMediaResponse {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO';
  fileUrl?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  sortOrder: number;
}

export interface PostResponse {
  id: string;
  authorId: string;
  groupId?: string | null;
  groupName?: string | null;
  groupIconUrl?: string | null;
  authorUsername: string;
  authorFullName: string;
  authorAvatarUrl?: string | null;
  content: string;
  imageUrl?: string | null;
  privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE';
  status: 'PUBLISHED' | 'SCHEDULED' | 'DRAFT';
  scheduledAt?: string | null;
  publishedAt?: string | null;
  locationText?: string | null;
  backgroundStyle?: string | null;
  promoted: boolean;
  reactionCount: number;
  reactionCounts?: PostReactionCountResponse[];
  currentUserReactionType?: ReactionType | null;
  savedByCurrentUser?: boolean;
  commentCount: number;
  shareCount: number;
  media: PostMediaResponse[];
  excludedUserIds: string[];
  taggedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface PostCommentResponse {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userFullName: string;
  userAvatarUrl?: string | null;
  parentCommentId?: string | null;
  replyCount: number;
  likeCount: number;
  isLikedByCurrentUser: boolean;
  isDeleted: boolean;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostShareResponse {
  id: string;
  postId: string;
  userId: string;
  userFullName: string;
  sharedContent?: string | null;
  createdAt: string;
}

export interface AddReactionPayload {
  userId: string;
  reactionType: ReactionType;
}

export interface PostReactionResponse {
  id: string;
  postId: string;
  userId: string;
  reactionType: ReactionType;
  createdAt: string;
  updatedAt: string;
}

export const postService = {
  getAllPosts: (currentUserId?: string, authorId?: string, page = 0, size = 10) => {
    const params = new URLSearchParams();
    if (currentUserId) params.append('currentUserId', currentUserId);
    if (authorId) params.append('authorId', authorId);
    params.append('page', page.toString());
    params.append('size', size.toString());
    return api.get<PaginatedResponse<PostResponse>>(`/posts?${params.toString()}`);
  },
  getGroupPosts: (groupId: string, currentUserId?: string) => {
    const params = new URLSearchParams({ groupId });
    if (currentUserId) params.append('currentUserId', currentUserId);
    return api.get<PostResponse[]>(`/posts?${params.toString()}`);
  },
  getGroupFeedPosts: (currentUserId?: string) => {
    const params = new URLSearchParams({ isGroupFeed: 'true' });
    if (currentUserId) params.append('currentUserId', currentUserId);
    return api.get<PostResponse[]>(`/posts?${params.toString()}`);
  },
  createPost: (data: CreatePostPayload) => api.post<PostResponse>('/posts', data),
  uploadPostImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.postMultipart<{ url: string }>('/posts/upload', formData);
  },
  addReaction: (postId: string, data: AddReactionPayload) =>
    api.post<PostReactionResponse>(`/posts/${postId}/reactions`, data),
  removeReaction: (postId: string, userId: string) =>
    api.delete<void>(`/posts/${postId}/reactions?userId=${encodeURIComponent(userId)}`),
  getReactionDetails: (postId: string) =>
    api.get<PostReactionDetailsResponse>(`/posts/${postId}/reactions/details`),
  getComments: (postId: string, page = 0, size = 10, currentUserId?: string) => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,asc' });
    if (currentUserId) params.append('currentUserId', currentUserId);
    return api.get<PaginatedResponse<PostCommentResponse>>(`/posts/${postId}/comments?${params.toString()}`);
  },
  getReplies: (postId: string, commentId: string, currentUserId?: string) => {
    const params = new URLSearchParams();
    if (currentUserId) params.append('currentUserId', currentUserId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return api.get<PostCommentResponse[]>(`/posts/${postId}/comments/${commentId}/replies${qs}`);
  },
  addComment: (postId: string, data: CreateCommentPayload) =>
    api.post<PostCommentResponse>(`/posts/${postId}/comments`, data),
  updateComment: (postId: string, commentId: string, data: { userId: string; content: string }) =>
    api.put<PostCommentResponse>(`/posts/${postId}/comments/${commentId}`, data),
  likeComment: (postId: string, commentId: string, userId: string) =>
    api.post<void>(`/posts/${postId}/comments/${commentId}/likes?userId=${encodeURIComponent(userId)}`, {}),
  unlikeComment: (postId: string, commentId: string, userId: string) =>
    api.delete<void>(`/posts/${postId}/comments/${commentId}/likes?userId=${encodeURIComponent(userId)}`),
  deleteComment: (postId: string, commentId: string, userId: string) =>
    api.delete<{ softDeleted: boolean }>(`/posts/${postId}/comments/${commentId}?userId=${encodeURIComponent(userId)}`),
  sharePost: (postId: string, data: SharePostPayload) =>
    api.post<PostShareResponse>(`/posts/${postId}/shares`, data),
  getPostById: (postId: string, currentUserId?: string) => {
    const params = new URLSearchParams();
    if (currentUserId) params.append('currentUserId', currentUserId);
    return api.get<PostResponse>(`/posts/${postId}?${params.toString()}`);
  },
  savePost: (userId: string, postId: string) =>
    api.post<void>('/posts/saved', { userId, postId }),
  getSavedPosts: (userId: string) =>
    api.get<PostResponse[]>(`/posts/saved/${userId}`),
  unsavePost: (userId: string, postId: string) =>
    api.delete<void>(`/posts/saved?userId=${encodeURIComponent(userId)}&postId=${encodeURIComponent(postId)}`),
};
