import { api } from './api';

export interface CreatePostPayload {
  authorId: string;
  content: string;
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
  authorUsername: string;
  authorFullName: string;
  authorAvatarUrl?: string | null;
  content: string;
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
  commentCount: number;
  shareCount: number;
  media: PostMediaResponse[];
  excludedUserIds: string[];
  taggedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PostCommentResponse {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userFullName: string;
  userAvatarUrl?: string | null;
  parentCommentId?: string | null;
  content: string;
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
  getAllPosts: (currentUserId?: string) =>
    api.get<PostResponse[]>(
      currentUserId ? `/posts?currentUserId=${encodeURIComponent(currentUserId)}` : '/posts',
    ),
  createPost: (data: CreatePostPayload) => api.post<PostResponse>('/posts', data),
  addReaction: (postId: string, data: AddReactionPayload) =>
    api.post<PostReactionResponse>(`/posts/${postId}/reactions`, data),
  removeReaction: (postId: string, userId: string) =>
    api.delete<void>(`/posts/${postId}/reactions?userId=${encodeURIComponent(userId)}`),
  getReactionDetails: (postId: string) =>
    api.get<PostReactionDetailsResponse>(`/posts/${postId}/reactions/details`),
  getComments: (postId: string) =>
    api.get<PostCommentResponse[]>(`/posts/${postId}/comments`),
  addComment: (postId: string, data: CreateCommentPayload) =>
    api.post<PostCommentResponse>(`/posts/${postId}/comments`, data),
  sharePost: (postId: string, data: SharePostPayload) =>
    api.post<PostShareResponse>(`/posts/${postId}/shares`, data),
};
