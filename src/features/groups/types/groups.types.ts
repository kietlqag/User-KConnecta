export interface Group {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  members: number;
  privacy: 'public' | 'private';
  lastActivity?: string;
  role?: 'ADMIN' | 'MEMBER' | 'PENDING' | null;
}

export interface GroupMember {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
}

export interface GroupsSidebarSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}
