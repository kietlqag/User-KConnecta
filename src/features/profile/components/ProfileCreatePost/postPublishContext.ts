export type PostPublishContext = 'PROFILE' | 'GROUP';

export type GroupPrivacyDisplay = 'public' | 'private';

export function getGroupPrivacySummary(privacy: GroupPrivacyDisplay): {
  title: string;
  description: string;
} {
  if (privacy === 'public') {
    return {
      title: 'Theo quyền riêng tư của nhóm',
      description: 'Mọi người có thể xem bài đăng trong nhóm công khai này.',
    };
  }
  return {
    title: 'Theo quyền riêng tư của nhóm',
    description: 'Chỉ thành viên nhóm xem được bài đăng trong nhóm này.',
  };
}

export function getGroupPrivacyShortLabel(privacy: GroupPrivacyDisplay): string {
  return privacy === 'public' ? 'Công khai' : 'Riêng tư';
}
