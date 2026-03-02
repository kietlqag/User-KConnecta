export interface Group {
  id: string;
  name: string;
  icon: string;
  members: number;
  privacy: 'public' | 'private';
  lastActivity?: string;
}

export interface GroupPost {
  id: string;
  group: {
    id: string;
    name: string;
    icon: string;
  };
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  timestamp: string;
  content: string;
  media?: {
    type: 'image' | 'video';
    url: string;
  };
  reactions: {
    like: number;
    love: number;
    haha: number;
  };
  commentsCount: number;
  sharesCount: number;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  reactions: number;
}

export interface GroupsSidebarSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}
