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
  // Set when sharing a group to the feed — the group being shared.
  sharedGroupId?: string;
  // Set when sharing an album to the feed — the album being shared.
  sharedAlbumId?: string;
  content: string;
  imageUrl?: string;
  media?: CreatePostMediaRequest[];
  privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'SPECIFIC_FRIENDS' | 'PRIVATE';
  excludedUserIds?: string[];
  allowedUserIds?: string[];
  status: 'PUBLISHED' | 'SCHEDULED' | 'DRAFT';
  scheduledAt?: string;
  locationText?: string | null;
  taggedUserIds?: string[];
  promoted?: boolean;
  poll?: CreatePostPollPayload;
}

export interface CreatePostPollPayload {
  options: string[];
  allowMultiple?: boolean;
  allowAddOptions?: boolean;
}

export interface PostPollOptionResponse {
  id: string;
  text: string;
  sortOrder: number;
  voteCount: number;
  percentage: number;
}

export interface PostPollResponse {
  id: string;
  allowMultiple: boolean;
  allowAddOptions: boolean;
  options: PostPollOptionResponse[];
  myVotedOptionIds: string[];
  totalVotes: number;
}

export interface VotePostPollPayload {
  optionId: string;
}

export interface AddPostPollOptionPayload {
  text: string;
}

export interface UpdatePostPayload {
  content: string;
  media?: CreatePostMediaRequest[];
  privacy?: PostResponse['privacy'];
  locationText?: string | null;
  excludedUserIds?: string[];
  allowedUserIds?: string[];
  taggedUserIds?: string[];
}

export interface CreateCommentPayload {
  userId: string;
  content: string;
  parentCommentId?: string;
}

export interface SharePostPayload {
  userId: string;
  sharedContent?: string;
  privacy?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  parentShareId?: string;
}

export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export type ReportCategory = 'SPAM' | 'VIOLENCE' | 'HATE_SPEECH' | 'NUDITY' | 'MISINFORMATION' | 'OTHER';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED';

export interface PostReportResponse {
  id: string;
  postId: string;
  reporterId: string;
  reporterUsername: string;
  category?: ReportCategory | null;
  reason?: string | null;
  status: ReportStatus;
  aiAnalysis?: string | null;
  aiSeverity?: string | null;
  createdAt: string;
}

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
  pageId?: string | null;
  pageName?: string | null;
  pageAvatarUrl?: string | null;
  authorUsername: string;
  authorFullName: string;
  authorAvatarUrl?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE';
  status: 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'HIDDEN' | 'DELETED';
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
  // Set to true when this is a share-wrapper entry (post-in-post)
  sharedPost?: boolean;
  // The embedded original post (only present when sharedPost is true)
  originalPost?: PostResponse;
  // Embedded group summary (only present when this post shares a group to the feed)
  sharedGroup?: SharedGroupResponse | null;
  sharedAlbum?: SharedAlbumResponse | null;
  poll?: PostPollResponse | null;
}

export interface SharedAlbumResponse {
  id: string;
  title: string;
  coverUrl?: string | null;
  mediaCount: number;
  ownerName: string;
}

export interface SharedGroupResponse {
  id: string;
  name: string;
  coverPhotoUrl?: string | null;
  privacy: 'PUBLIC' | 'PRIVATE';
  memberCount: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/** Spring Data VIA_DTO wraps metadata in `page`; older responses use flat fields. */
type SpringPaginatedRaw<T> = {
  content: T[];
  page?: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

export function normalizePaginatedResponse<T>(raw: SpringPaginatedRaw<T>): PaginatedResponse<T> {
  if (raw.page) {
    return {
      content: raw.content ?? [],
      number: raw.page.number,
      size: raw.page.size,
      totalElements: raw.page.totalElements,
      totalPages: raw.page.totalPages,
    };
  }
  return {
    content: raw.content ?? [],
    number: raw.number ?? 0,
    size: raw.size ?? raw.content?.length ?? 0,
    totalElements: raw.totalElements ?? raw.content?.length ?? 0,
    totalPages: raw.totalPages ?? 1,
  };
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
  moderationStatus?: string | null;
  moderationFailReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostShareResponse {
  postId: string;
  userId: string;
  userFullName: string;
  shareCount: number;
  wrapperShareCount?: number | null;
}

export interface CheckInSuggestionResponse {
  locationText: string;
  usageCount: number;
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
  getAllPosts: (currentUserId?: string, authorId?: string, page = 0, size = 10, status?: string) => {
    const params = new URLSearchParams();
    if (currentUserId) params.append('currentUserId', currentUserId);
    if (authorId) params.append('authorId', authorId);
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (status) params.append('status', status);
    return api
      .get<SpringPaginatedRaw<PostResponse>>(`/posts?${params.toString()}`)
      .then(normalizePaginatedResponse);
  },
  getWatchPosts: (currentUserId?: string, page = 0, size = 20) => {
    const params = new URLSearchParams();
    if (currentUserId) params.append('currentUserId', currentUserId);
    params.append('page', page.toString());
    params.append('size', size.toString());
    return api
      .get<SpringPaginatedRaw<PostResponse>>(`/posts/watch?${params.toString()}`)
      .then(normalizePaginatedResponse);
  },
  getGroupPosts: (groupId: string, currentUserId?: string) => {
    const params = new URLSearchParams({ groupId });
    if (currentUserId) params.append('currentUserId', currentUserId);
    return api.get<PostResponse[]>(`/posts?${params.toString()}`);
  },
  getGroupFeedPosts: (currentUserId?: string, page = 0, size = 10) => {
    const params = new URLSearchParams({ isGroupFeed: 'true' });
    if (currentUserId) params.append('currentUserId', currentUserId);
    params.append('page', page.toString());
    params.append('size', size.toString());
    return api
      .get<SpringPaginatedRaw<PostResponse>>(`/posts?${params.toString()}`)
      .then(normalizePaginatedResponse);
  },
  createPost: (data: CreatePostPayload) => {
    if (import.meta.env.DEV) {
      console.log('[post-schedule] api payload', {
        status: data.status,
        scheduledAt: data.scheduledAt ?? null,
        groupId: data.groupId ?? null,
      });
    }
    return api.post<PostResponse>('/posts', data);
  },
  updatePost: (postId: string, data: UpdatePostPayload) =>
    api.put<PostResponse>(`/posts/${postId}`, data),
  uploadPostImage: (file: File, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.postMultipart<{ url: string }>('/posts/upload', formData, signal);
  },
  deletePostMedia: (url: string) =>
    api.delete<void>(`/posts/media?url=${encodeURIComponent(url)}`),
  addReaction: (postId: string, data: AddReactionPayload) =>
    api.post<PostReactionResponse>(`/posts/${postId}/reactions`, data),
  removeReaction: (postId: string, userId: string) =>
    api.delete<void>(`/posts/${postId}/reactions?userId=${encodeURIComponent(userId)}`),
  getReactionDetails: (postId: string) =>
    api.get<PostReactionDetailsResponse>(`/posts/${postId}/reactions/details`),
  getComments: (postId: string, page = 0, size = 10, currentUserId?: string, sort = 'createdAt,asc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    if (currentUserId) params.append('currentUserId', currentUserId);
    return api
      .get<SpringPaginatedRaw<PostCommentResponse>>(`/posts/${postId}/comments?${params.toString()}`)
      .then(normalizePaginatedResponse);
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
  getCheckInSuggestions: (params: { currentUserId?: string; province?: string; ward?: string }) => {
    const query = new URLSearchParams();
    if (params.currentUserId) query.append('currentUserId', params.currentUserId);
    if (params.province) query.append('province', params.province);
    if (params.ward) query.append('ward', params.ward);
    return api.get<CheckInSuggestionResponse[]>(`/posts/checkin-suggestions?${query.toString()}`);
  },
  savePost: (_userId: string, postId: string) =>
    api.post<void>('/posts/saved', { postId }),
  getSavedPosts: (_userId: string) =>
    api.get<PostResponse[]>('/posts/saved'),
  unsavePost: (_userId: string, postId: string) =>
    api.delete<void>(`/posts/saved?postId=${encodeURIComponent(postId)}`),
  deletePost: (postId: string, userId: string) =>
    api.delete<void>(`/posts/${postId}?userId=${encodeURIComponent(userId)}`),
  updatePrivacy: (postId: string, userId: string, privacy: PostResponse['privacy']) => {
    const params = new URLSearchParams({ userId, privacy });
    return api.patch<PostResponse>(`/posts/${postId}/privacy?${params.toString()}`);
  },
  reportPost: (postId: string, reporterId: string, category?: ReportCategory, reason?: string) =>
    api.post<void>(`/posts/${postId}/reports`, {
      reporterId,
      category: category ?? null,
      reason: reason?.trim() || null,
    }),
  reportComment: (commentId: string, reporterId: string, category?: ReportCategory, reason?: string) =>
    api.post<void>(`/posts/comments/${commentId}/reports`, {
      reporterId,
      category: category ?? null,
      reason: reason?.trim() || null,
    }),
  getMyReports: () =>
    api.get<PostReportResponse[]>('/posts/reports/my'),
  votePoll: (postId: string, payload: VotePostPollPayload) =>
    api.put<PostPollResponse>(`/posts/${encodeURIComponent(postId)}/poll/vote`, payload),
  addPollOption: (postId: string, payload: AddPostPollOptionPayload) =>
    api.post<PostPollResponse>(`/posts/${encodeURIComponent(postId)}/poll/options`, payload),
  deletePollOption: (postId: string, optionId: string) =>
    api.delete<PostPollResponse>(`/posts/${encodeURIComponent(postId)}/poll/options/${encodeURIComponent(optionId)}`),
};
