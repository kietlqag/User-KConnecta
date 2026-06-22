import { extractGroupJoinTokenFromText } from './groupJoinLink';

const CALL_LOG_PREFIX = '__CALL_LOG__:';
const REPLY_PREFIX = '__REPLY__:';
const VOICE_MESSAGE_PREFIX = '__VOICE__:';
const VIDEO_MESSAGE_PREFIX = '__VIDEO_MSG__:';
const IMAGE_MESSAGE_PREFIX = '__IMAGE__:';
const FILE_MESSAGE_PREFIX = '__FILE__:';
const VIDEO_SHARE_PREFIX = '__VIDEO_SHARE__:';
const POST_SHARE_PREFIX = '__POST_SHARE__:';
const GROUP_SHARE_PREFIX = '__GROUP_SHARE__:';
const CHAT_ACTION_PREFIX = '__CHAT_ACTION__:';
const STORY_REPLY_PREFIX = '__STORY_REPLY__:';

function mapPlainTextPreview(raw: string): string {
  if (extractGroupJoinTokenFromText(raw)) {
    return 'Liên kết tham gia nhóm';
  }
  if (/^https?:\/\/[^\s]+$/i.test(raw)) {
    return 'Liên kết';
  }
  const replaced = raw.replace(/https?:\/\/[^\s]*[?&]join=[^\s]+/gi, 'Liên kết tham gia nhóm');
  if (replaced !== raw) {
    return replaced.trim();
  }
  return raw;
}

/** Map stored message content to a short sidebar preview. Returns empty for non-preview system events. */
export function mapContentToConversationPreview(content?: string | null): string {
  const raw = content?.trim();
  if (!raw) return '';

  if (raw.startsWith(CHAT_ACTION_PREFIX)) {
    return '';
  }

  if (raw.startsWith(VOICE_MESSAGE_PREFIX)) {
    return 'Tin nhắn thoại';
  }

  if (raw.startsWith(VIDEO_MESSAGE_PREFIX)) {
    return 'Video';
  }

  if (raw.startsWith(IMAGE_MESSAGE_PREFIX)) {
    return 'Ảnh';
  }

  if (raw.startsWith(VIDEO_SHARE_PREFIX)) {
    return 'Video';
  }

  if (raw.startsWith(POST_SHARE_PREFIX)) {
    return 'Đã chia sẻ một bài viết';
  }

  if (raw.startsWith(GROUP_SHARE_PREFIX)) {
    return 'Đã chia sẻ một nhóm';
  }

  if (raw.startsWith(FILE_MESSAGE_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(FILE_MESSAGE_PREFIX.length));
      return typeof payload?.fileName === 'string' && payload.fileName.trim() ? payload.fileName.trim() : 'File';
    } catch {
      return 'File';
    }
  }

  if (raw.startsWith(STORY_REPLY_PREFIX) || raw.includes('STORY_REPLY')) {
    try {
      const rawPayload = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : '';
      const payload = rawPayload ? JSON.parse(rawPayload) : null;
      if (typeof payload?.text === 'string' && payload.text.trim()) {
        return payload.text.trim();
      }
    } catch {
      // ignore invalid payload
    }
    return 'Đã trả lời tin';
  }

  if (raw.startsWith(REPLY_PREFIX)) {
    try {
      const payload = JSON.parse(raw.slice(REPLY_PREFIX.length));
      const replyText = typeof payload?.text === 'string' ? payload.text.trim() : raw;
      return mapPlainTextPreview(replyText);
    } catch {
      return mapPlainTextPreview(raw);
    }
  }

  if (!raw.startsWith(CALL_LOG_PREFIX)) {
    return mapPlainTextPreview(raw);
  }

  try {
    const payload = JSON.parse(raw.slice(CALL_LOG_PREFIX.length));
    const mediaType: 'audio' | 'video' =
      payload?.mediaType === 'video' || String(payload?.label || '').toLowerCase().includes('video')
        ? 'video'
        : 'audio';

    if (typeof payload?.label === 'string' && payload.label.trim()) {
      return payload.label.trim();
    }
    if (payload?.kind === 'completed') {
      return mediaType === 'video' ? 'Cuộc gọi video hoàn thành' : 'Cuộc gọi thoại hoàn thành';
    }
    return mediaType === 'video' ? 'Đã bỏ lỡ cuộc gọi video' : 'Đã bỏ lỡ cuộc gọi thoại';
  } catch {
    return 'Đã bỏ lỡ cuộc gọi thoại';
  }
}

export function formatConversationPreview(text: string, isOwn: boolean) {
  const normalized = text.trim();
  if (!normalized) return '';
  return isOwn ? `Bạn: ${normalized}` : normalized;
}

export function buildConversationPreviewFromContent(
  content: string | null | undefined,
  senderId: string | null | undefined,
  currentUserId: string | null | undefined,
) {
  const previewText = mapContentToConversationPreview(content);
  if (!previewText) return '';
  const isOwn = Boolean(senderId && currentUserId && senderId === currentUserId);
  return formatConversationPreview(previewText, isOwn);
}
