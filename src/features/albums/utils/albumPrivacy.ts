import { Globe, Lock, UserCheck } from 'lucide-react';
import type { AlbumPrivacy } from '@/services/albumService';

export const ALBUM_PRIVACY_OPTIONS: {
  value: AlbumPrivacy;
  label: string;
  hint: string;
  icon: typeof Globe;
}[] = [
  { value: 'PUBLIC', label: 'Công khai', hint: 'Mọi người có thể xem', icon: Globe },
  { value: 'FRIENDS', label: 'Bạn bè', hint: 'Chỉ bạn bè được xem', icon: UserCheck },
  { value: 'ONLY_ME', label: 'Riêng tư', hint: 'Chỉ mình bạn', icon: Lock },
];

export function getAlbumPrivacyMeta(privacy: AlbumPrivacy) {
  return ALBUM_PRIVACY_OPTIONS.find((option) => option.value === privacy) ?? ALBUM_PRIVACY_OPTIONS[0];
}
