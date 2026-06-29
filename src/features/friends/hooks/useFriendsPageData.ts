import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { friendService, FRIENDSHIP_CHANGED_EVENT, type FriendApiResponse } from '@/services/friendService';
import { Friend, FriendRequest } from '../types/friends.types';
import { FriendsTab } from '../components/FriendsLeftSidebar/FriendsLeftSidebar';

function mapRequest(r: FriendApiResponse): FriendRequest {
  return {
    id: r.friendshipId!,
    userId: r.userId,
    name: r.fullName,
    avatar: r.avatarUrl || '',
    mutualFriends: r.mutualFriends,
    timestamp: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '',
  };
}

function mapSuggestion(s: FriendApiResponse): Friend {
  return {
    id: s.userId,
    userId: s.userId,
    name: s.fullName,
    avatar: s.avatarUrl || '',
    mutualFriends: s.mutualFriends,
    suggestionReason: s.suggestionReason,
    isFriend: false,
  };
}

function mapFriend(f: FriendApiResponse): Friend {
  return {
    id: f.friendshipId!,
    userId: f.userId,
    name: f.fullName,
    avatar: f.avatarUrl || '',
    mutualFriends: f.mutualFriends,
    isFriend: true,
  };
}

function needsSentRequests(tab: FriendsTab) {
  return tab === 'sent-requests';
}

function needsRequestsForContent(tab: FriendsTab) {
  return tab === 'home' || tab === 'requests';
}

function needsSuggestions(tab: FriendsTab) {
  return tab === 'home';
}

function needsFriendsList(tab: FriendsTab) {
  return tab === 'all-friends';
}

export function useFriendsPageData(userId: string | undefined, activeTab: FriendsTab) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: ['friend-requests', userId] });
      void queryClient.invalidateQueries({ queryKey: ['sent-friend-requests', userId] });
      void queryClient.invalidateQueries({ queryKey: ['friend-suggestions', userId] });
      void queryClient.invalidateQueries({ queryKey: ['friends', userId] });
    };
    window.addEventListener(FRIENDSHIP_CHANGED_EVENT, invalidate);
    return () => window.removeEventListener(FRIENDSHIP_CHANGED_EVENT, invalidate);
  }, [queryClient, userId]);

  const requestsQuery = useQuery({
    queryKey: ['friend-requests', userId],
    queryFn: () => friendService.getFriendRequests(),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const sentRequestsQuery = useQuery({
    queryKey: ['sent-friend-requests', userId],
    queryFn: () => friendService.getSentFriendRequests(),
    enabled: !!userId && needsSentRequests(activeTab),
    staleTime: 60_000,
  });

  const suggestionsQuery = useQuery({
    queryKey: ['friend-suggestions', userId],
    queryFn: () => friendService.getSuggestions(userId!),
    enabled: !!userId && needsSuggestions(activeTab),
    staleTime: 120_000,
  });

  const friendsQuery = useQuery({
    queryKey: ['friends', userId],
    queryFn: () => friendService.getFriends(userId!),
    enabled: !!userId && needsFriendsList(activeTab),
    staleTime: 60_000,
  });

  const loading =
    (needsRequestsForContent(activeTab) && requestsQuery.isLoading) ||
    (needsSentRequests(activeTab) && sentRequestsQuery.isLoading) ||
    (needsSuggestions(activeTab) && suggestionsQuery.isLoading) ||
    (needsFriendsList(activeTab) && friendsQuery.isLoading);

  const error = requestsQuery.error ?? sentRequestsQuery.error ?? suggestionsQuery.error ?? friendsQuery.error;

  return {
    friendRequests: (requestsQuery.data ?? []).map(mapRequest),
    sentFriendRequests: (sentRequestsQuery.data ?? []).map(mapRequest),
    suggestions: (suggestionsQuery.data ?? []).map(mapSuggestion),
    friends: (friendsQuery.data ?? []).map(mapFriend),
    loading,
    error,
    refetch: () => {
      void requestsQuery.refetch();
      if (needsSentRequests(activeTab)) void sentRequestsQuery.refetch();
      if (needsSuggestions(activeTab)) void suggestionsQuery.refetch();
      if (needsFriendsList(activeTab)) void friendsQuery.refetch();
    },
  };
}
