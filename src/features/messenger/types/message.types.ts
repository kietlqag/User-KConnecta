export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
  reactions?: string[];
}

export interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}
