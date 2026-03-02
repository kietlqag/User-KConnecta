export interface User {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
}

export interface Story {
  id: string;
  user: User;
  image: string;
  isViewed: boolean;
}

export interface Post {
  id: string;
  user: User;
  content: string;
  images?: string[];
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: number;
}

export interface Contact extends User {
  status?: string;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  image: string;
  sponsor: string;
}
