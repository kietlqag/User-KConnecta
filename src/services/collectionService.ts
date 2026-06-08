import { api } from './api';

export interface CollectionResponse {
  id: string;
  name: string;
  description?: string | null;
  thumbnail?: string | null;
  itemCount: number;
  createdAt: string;
}

export interface CreateCollectionPayload {
  userId: string;
  name: string;
  description?: string;
}

export const collectionService = {
  getCollections: (userId: string) =>
    api.get<CollectionResponse[]>(`/collections?userId=${encodeURIComponent(userId)}`),

  createCollection: (data: CreateCollectionPayload) =>
    api.post<CollectionResponse>('/collections', data),

  addItem: (collectionId: string, userId: string, postId: string) =>
    api.post<void>(`/collections/${collectionId}/items`, { userId, postId }),

  removeItem: (collectionId: string, userId: string, postId: string) =>
    api.delete<void>(
      `/collections/${collectionId}/items?userId=${encodeURIComponent(userId)}&postId=${encodeURIComponent(postId)}`,
    ),

  getItemCollectionIds: (userId: string, postId: string) =>
    api.get<string[]>(
      `/collections/by-item?userId=${encodeURIComponent(userId)}&postId=${encodeURIComponent(postId)}`,
    ),

  getCollectionPostIds: (collectionId: string, userId: string) =>
    api.get<string[]>(
      `/collections/${collectionId}/post-ids?userId=${encodeURIComponent(userId)}`,
    ),
};
