import { api } from './api';

export interface CreatePostPayload {
  authorId: string;
  content: string;
  privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE';
  status: 'PUBLISHED' | 'SCHEDULED' | 'DRAFT';
  promoted?: boolean;
}

export const postService = {
  createPost: (data: CreatePostPayload) => api.post('/posts', data),
};
