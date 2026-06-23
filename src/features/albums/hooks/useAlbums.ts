import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import {
  albumService,
  type Album,
  type AlbumComment,
  type AlbumSidebarItem,
  type CreateAlbumPayload,
  type SpringPage,
  type UpdateAlbumPayload,
} from '@/services/albumService';

export const ALBUM_SIDEBAR_KEY = ['albums', 'sidebar'] as const;
export const MY_ALBUMS_KEY = ['albums', 'mine'] as const;
export const GROUP_ALBUMS_KEY = ['albums', 'group'] as const;

export function useAlbumSidebar() {
  const currentUser = authService.getCurrentUser();
  return useQuery<AlbumSidebarItem[]>({
    queryKey: [...ALBUM_SIDEBAR_KEY, currentUser?.id],
    queryFn: () => albumService.getSidebar(),
    enabled: !!currentUser?.id,
    staleTime: 60_000,
  });
}

export const USER_ALBUMS_KEY = ['albums', 'user'] as const;

export function useUserAlbums(userId: string | undefined, page = 0, size = 12) {
  return useQuery({
    queryKey: [...USER_ALBUMS_KEY, userId, page, size],
    queryFn: () => albumService.getUserAlbums(userId!, page, size),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useMyAlbums(page = 0, size = 12) {
  const currentUser = authService.getCurrentUser();
  return useQuery({
    queryKey: [...MY_ALBUMS_KEY, currentUser?.id, page, size],
    queryFn: () => albumService.getMyAlbums(page, size),
    enabled: !!currentUser?.id,
    staleTime: 30_000,
  });
}

export function useAlbumDetail(albumId: string | undefined) {
  return useQuery<Album>({
    queryKey: ['albums', 'detail', albumId],
    queryFn: () => albumService.getById(albumId!, true),
    enabled: !!albumId,
    staleTime: 15_000,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAlbumPayload) => albumService.create(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ALBUM_SIDEBAR_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_ALBUMS_KEY });
      void queryClient.invalidateQueries({ queryKey: USER_ALBUMS_KEY });
      if (variables.groupId) {
        void queryClient.invalidateQueries({ queryKey: [...GROUP_ALBUMS_KEY, variables.groupId] });
      }
    },
  });
}

export function useUpdateAlbum(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAlbumPayload) => albumService.update(albumId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['albums', 'detail', albumId] });
      void queryClient.invalidateQueries({ queryKey: ALBUM_SIDEBAR_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_ALBUMS_KEY });
      void queryClient.invalidateQueries({ queryKey: USER_ALBUMS_KEY });
    },
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (albumId: string) => albumService.delete(albumId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ALBUM_SIDEBAR_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_ALBUMS_KEY });
      void queryClient.invalidateQueries({ queryKey: USER_ALBUMS_KEY });
      void queryClient.invalidateQueries({ queryKey: GROUP_ALBUMS_KEY });
    },
  });
}

export function useReorderMyAlbums() {
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();
  return useMutation({
    mutationFn: (albumIds: string[]) => albumService.reorderMyAlbums(albumIds),
    onSuccess: (_data, albumIds) => {
      queryClient.setQueriesData<SpringPage<Album>>(
        { queryKey: MY_ALBUMS_KEY },
        (old) => {
          if (!old?.content) return old;
          const byId = new Map(old.content.map((album) => [album.id, album]));
          const reordered = albumIds
            .map((id) => byId.get(id))
            .filter((album): album is Album => album != null);
          const rest = old.content.filter((album) => !albumIds.includes(album.id));
          return { ...old, content: [...reordered, ...rest] };
        },
      );
      void queryClient.invalidateQueries({ queryKey: [...ALBUM_SIDEBAR_KEY, currentUser?.id] });
    },
  });
}

export function useUploadAlbumMedia(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, caption }: { file: File; caption?: string }) =>
      albumService.uploadMedia(albumId, file, caption),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['albums', 'detail', albumId] });
      void queryClient.invalidateQueries({ queryKey: ALBUM_SIDEBAR_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_ALBUMS_KEY });
      void queryClient.invalidateQueries({ queryKey: USER_ALBUMS_KEY });
    },
  });
}

export function useDeleteAlbumMedia(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => albumService.deleteMedia(albumId, mediaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['albums', 'detail', albumId] });
      void queryClient.invalidateQueries({ queryKey: ALBUM_SIDEBAR_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_ALBUMS_KEY });
      void queryClient.invalidateQueries({ queryKey: USER_ALBUMS_KEY });
    },
  });
}

export function useGroupAlbums(groupId: string | undefined) {
  return useQuery({
    queryKey: [...GROUP_ALBUMS_KEY, groupId],
    queryFn: () => albumService.getGroupAlbums(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

export function useAlbumComments(albumId: string | undefined) {
  return useQuery<AlbumComment[]>({
    queryKey: ['albums', 'comments', albumId],
    queryFn: () => albumService.getComments(albumId!),
    enabled: !!albumId,
    staleTime: 10_000,
  });
}

export function useAddAlbumComment(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => albumService.addComment(albumId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['albums', 'comments', albumId] });
      void queryClient.invalidateQueries({ queryKey: ['albums', 'detail', albumId] });
    },
  });
}

export function useReorderAlbumMedia(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaIds: string[]) => albumService.reorderMedia(albumId, mediaIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['albums', 'detail', albumId] });
    },
  });
}

export function useSetAlbumCover(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => albumService.setCover(albumId, mediaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['albums', 'detail', albumId] });
      void queryClient.invalidateQueries({ queryKey: ALBUM_SIDEBAR_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_ALBUMS_KEY });
      void queryClient.invalidateQueries({ queryKey: USER_ALBUMS_KEY });
    },
  });
}

export function useShareAlbum(albumId: string) {
  return useMutation({
    mutationFn: ({ message, shareToFeed }: { message?: string; shareToFeed?: boolean }) =>
      albumService.share(albumId, message, shareToFeed ?? true),
  });
}
