import type { LucideIcon } from 'lucide-react';
import { FileText, MessageSquare, Users, Calendar, Images, UserCheck, Album } from 'lucide-react';

export const GROUP_DETAIL_TABS = [
  {
    id: 'description',
    label: 'Mô tả',
    shortLabel: 'Mô tả',
    icon: FileText,
    ready: true,
  },
  {
    id: 'discussion',
    label: 'Bài viết',
    shortLabel: 'Bài viết',
    icon: MessageSquare,
    ready: true,
  },
  {
    id: 'members',
    label: 'Thành viên',
    shortLabel: 'Thành viên',
    icon: Users,
    ready: true,
  },
  {
    id: 'requests',
    label: 'Yêu cầu tham gia',
    shortLabel: 'Yêu cầu',
    icon: UserCheck,
    ready: true,
  },
  {
    id: 'events',
    label: 'Sự kiện',
    shortLabel: 'Sự kiện',
    icon: Calendar,
    ready: true,
  },
  {
    id: 'media',
    label: 'Ảnh & Video',
    shortLabel: 'Ảnh/Video',
    icon: Images,
    ready: true,
  },
  {
    id: 'albums',
    label: 'Album',
    shortLabel: 'Album',
    icon: Album,
    ready: true,
  },
] as const;

export type GroupDetailTabId = (typeof GROUP_DETAIL_TABS)[number]['id'];

export type GroupDetailTabConfig = (typeof GROUP_DETAIL_TABS)[number] & { icon: LucideIcon };

export const DEFAULT_GROUP_TAB: GroupDetailTabId = 'discussion';

export function isGroupDetailTabId(value: string | null | undefined): value is GroupDetailTabId {
  return GROUP_DETAIL_TABS.some(t => t.id === value);
}

export function getGroupDetailTab(id: GroupDetailTabId): GroupDetailTabConfig {
  return GROUP_DETAIL_TABS.find(t => t.id === id)!;
}
