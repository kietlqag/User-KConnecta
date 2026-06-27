export interface Group {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  members: number;
  privacy: 'public' | 'private';
  memberApprovalRequired: boolean;
  lastActivity?: string;
  /** Raw ISO timestamp of last activity, used for sorting. */
  updatedAt?: string;
  /** Raw ISO timestamp of group creation. */
  createdAt?: string;
  role?: 'ADMIN' | 'MEMBER' | 'PENDING' | null;
}

export interface GroupMember {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

export interface GroupsSidebarSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}
