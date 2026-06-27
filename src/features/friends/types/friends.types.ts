export interface Friend {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  mutualFriends: number;
  suggestionReason?: string | null;
  isFriend: boolean;
}

export interface FriendRequest {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  mutualFriends: number;
  timestamp: string;
}

export interface FriendsSidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  path?: string;
}
