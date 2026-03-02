export interface Friend {
  id: string;
  name: string;
  avatar: string;
  mutualFriends: number;
  isFriend: boolean;
}

export interface FriendRequest {
  id: string;
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
