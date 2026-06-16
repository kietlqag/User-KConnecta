import { api } from './api';

export interface StoryResponse {
  id: string;
  userId: string;
  username: string;
  userFullName: string;
  userAvatarUrl: string;
  imageUrl: string | null;
  backgroundColor: string | null;
  textContent: string | null;
  textColor: string | null;
  textSize: number | null;
  textPosX: number | null;
  textPosY: number | null;
  musicTrackId: string | null;
  altText: string | null;
  linkedPostId: string | null;
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

export const storyService = {
  /**
   * Create a new story (multipart/form-data)
   * Backend: POST /api/stories
   */
  createStory: (params: {
    userId: string;
    image?: File | null;
    textContent?: string;
    textColor?: string;
    textSize?: number;
    textPosX?: number;
    textPosY?: number;
    musicTrackId?: string;
    altText?: string;
    backgroundColor?: string;
    sharedImageUrl?: string;
    linkedPostId?: string;
  }) => {
    const formData = new FormData();
    formData.append('userId', params.userId);
    if (params.image) formData.append('image', params.image);
    if (params.textContent) formData.append('textContent', params.textContent);
    if (params.textColor) formData.append('textColor', params.textColor);
    if (params.textSize != null) formData.append('textSize', String(params.textSize));
    if (params.textPosX != null) formData.append('textPosX', String(params.textPosX));
    if (params.textPosY != null) formData.append('textPosY', String(params.textPosY));
    if (params.musicTrackId) formData.append('musicTrackId', params.musicTrackId);
    if (params.altText) formData.append('altText', params.altText);
    if (params.backgroundColor) formData.append('backgroundColor', params.backgroundColor);
    if (params.sharedImageUrl) formData.append('sharedImageUrl', params.sharedImageUrl);
    if (params.linkedPostId) formData.append('linkedPostId', params.linkedPostId);
    return api.postMultipart<StoryResponse>('/stories', formData);
  },

  getAllActiveStories: () => api.get<StoryResponse[]>('/stories'),

  getActiveStoriesByUser: (userId: string) =>
    api.get<StoryResponse[]>(`/stories/users/${userId}`),

  deleteStory: (storyId: string, userId: string) =>
    api.delete<void>(`/stories/${storyId}?userId=${userId}`),
};
