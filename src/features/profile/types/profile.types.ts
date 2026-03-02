export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  coverPhoto: string;
  friendsCount: number;
  location?: string;
  school?: string;
  hometown?: string;
  relationship?: string;
  bio?: string;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  mutualFriends?: number;
}

export interface Photo {
  id: string;
  url: string;
  caption?: string;
  timestamp: string;
}

export interface FeaturedPhoto {
  id: string;
  url: string;
  count?: number;
}
