import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { groupService, type GroupApiResponse } from '@/services/groupService';
import { Group, GroupMember } from '../types/groups.types';
export type { GroupApiResponse };

function formatLastActivity(updatedAt: string): string {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Lần hoạt động gần nhất: vài giây trước';
  if (minutes < 60) return `Lần hoạt động gần nhất: ${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Lần hoạt động gần nhất: ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `Lần hoạt động gần nhất: ${days} ngày trước`;
}

export function mapApiGroup(g: GroupApiResponse): Group {
  return {
    id: g.id,
    name: g.name,
    icon: g.coverPhotoUrl ?? '',
    members: g.memberCount,
    privacy: g.privacy === 'PUBLIC' ? 'public' : 'private',
    lastActivity: formatLastActivity(g.updatedAt),
    role: g.role,
  };
}

export function useJoinedGroups() {
  const currentUser = authService.getCurrentUser();
  return useQuery<Group[]>({
    queryKey: ['groups', 'joined', currentUser?.id],
    queryFn: async () => {
      const data = await groupService.getJoinedGroups(currentUser!.id);
      return data.map(mapApiGroup);
    },
    enabled: !!currentUser?.id,
    staleTime: 30_000,
  });
}

export function useManagedGroups() {
  const currentUser = authService.getCurrentUser();
  return useQuery<Group[]>({
    queryKey: ['groups', 'managed', currentUser?.id],
    queryFn: async () => {
      const data = await groupService.getManagedGroups(currentUser!.id);
      return data.map(mapApiGroup);
    },
    enabled: !!currentUser?.id,
    staleTime: 30_000,
  });
}

export function useGroupById(groupId: string | undefined) {
  const currentUser = authService.getCurrentUser();
  return useQuery<Group>({
    queryKey: ['groups', 'detail', groupId],
    queryFn: async () => {
      const data = await groupService.getGroupById(groupId!, currentUser?.id);
      return mapApiGroup(data);
    },
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

export function useDiscoverGroups() {
  const currentUser = authService.getCurrentUser();
  return useQuery<Group[]>({
    queryKey: ['groups', 'discover', currentUser?.id],
    queryFn: async () => {
      const data = await groupService.getDiscoverGroups(currentUser!.id);
      return data.map(mapApiGroup);
    },
    enabled: !!currentUser?.id,
    staleTime: 30_000,
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();

  return useMutation({
    mutationFn: (groupId: string) => groupService.joinGroup(groupId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'joined'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'discover'] });
    },
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery<GroupMember[]>({
    queryKey: ['groups', 'members', groupId],
    queryFn: async () => {
      const data = await groupService.getGroupMembers(groupId!);
      return data; // already matches GroupMember shape
    },
    enabled: !!groupId,
    staleTime: 60_000,
  });
}

export function useInviteFriends() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userIds }: { groupId: string; userIds: string[] }) =>
      groupService.inviteFriends(groupId, userIds),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'members', groupId] });
    },
  });
}
