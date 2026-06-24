import type { PublicPolicyResponse } from '@/types/policy';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};

const EXT_TO_MIME: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  svg: ['image/svg+xml'],
  heic: ['image/heic'],
  mp4: ['video/mp4'],
  mov: ['video/quicktime'],
  webm: ['video/webm'],
  mkv: ['video/x-matroska'],
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
};

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv']);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt']);

export type PostMediaKind = 'image' | 'video' | 'document';

export const parseAllowedFileTypes = (raw: string): string[] => {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((s) => normalizeExtension(s))
        .filter(Boolean),
    ),
  ];
};

export const normalizeExtension = (raw: string): string => {
  const t = raw.trim().toLowerCase().replace(/^\./, '');
  if (!t) return '';
  return t.replace(/[^a-z0-9]/g, '');
};

const expandAllowedSet = (exts: string[]): Set<string> => {
  const set = new Set(exts);
  if (set.has('jpg') || set.has('jpeg')) {
    set.add('jpg');
    set.add('jpeg');
  }
  return set;
};

export const getFileExtension = (file: File): string => {
  const fromName = normalizeExtension(file.name.split('.').pop() ?? '');
  if (fromName) return fromName;
  const fromMime = MIME_TO_EXT[file.type.toLowerCase()];
  return fromMime ? normalizeExtension(fromMime) : '';
};

export const getPostMediaKind = (file: File): PostMediaKind => {
  const type = file.type.toLowerCase();
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('image/')) return 'image';

  const ext = getFileExtension(file);
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (DOCUMENT_EXTENSIONS.has(ext) || type === 'application/pdf') return 'document';

  return 'document';
};

export const toApiMediaType = (kind: PostMediaKind): 'IMAGE' | 'VIDEO' | 'DOCUMENT' => {
  if (kind === 'video') return 'VIDEO';
  if (kind === 'document') return 'DOCUMENT';
  return 'IMAGE';
};

export const isFileExtensionAllowed = (ext: string, allowedRaw: string): boolean => {
  const normalized = normalizeExtension(ext);
  if (!normalized) return false;
  const allowed = expandAllowedSet(parseAllowedFileTypes(allowedRaw));
  if (allowed.size === 0) return true;
  return allowed.has(normalized);
};

export const isPostMediaFileAllowed = (
  file: File,
  allowedRaw: string,
): boolean => isFileExtensionAllowed(getFileExtension(file), allowedRaw);

export const formatAllowedFileTypesLabel = (allowedRaw: string): string =>
  parseAllowedFileTypes(allowedRaw)
    .map((e) => e.toUpperCase())
    .join(', ');

export const buildPostMediaAcceptAttribute = (allowedRaw: string): string => {
  const exts = parseAllowedFileTypes(allowedRaw);
  if (exts.length === 0) return 'image/*,video/*,application/pdf,.pdf';

  const parts = new Set<string>();
  for (const ext of exts) {
    parts.add(`.${ext}`);
    for (const mime of EXT_TO_MIME[ext] ?? []) {
      parts.add(mime);
    }
  }
  return [...parts].join(',');
};

export function validatePostMediaFile(
  file: File,
  policy: PublicPolicyResponse | undefined,
): string | null {
  const ext = getFileExtension(file);
  if (!ext) {
    return 'Không xác định được định dạng file';
  }

  if (!policy) {
    return 'Đang tải quy định đăng bài. Vui lòng thử lại sau.';
  }

  const allowedRaw = policy.postPolicy.allowedFileTypes;
  if (!isFileExtensionAllowed(ext, allowedRaw)) {
    return `Định dạng .${ext.toUpperCase()} không được phép. Chỉ chấp nhận: ${formatAllowedFileTypesLabel(allowedRaw)}`;
  }
  return null;
}
