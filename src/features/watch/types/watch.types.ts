export interface Reel {
  id: string;
  videoUrl: string;
  thumbnail: string;
  creator: {
    id: string;
    name: string;
    avatar: string;
    verified?: boolean;
  };
  caption: string;
  music?: {
    name: string;
    artist: string;
  };
  likes: number;
  comments: number;
  shares: number;
  views: number;
  duration: number;
}

export interface ReelComment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
}
