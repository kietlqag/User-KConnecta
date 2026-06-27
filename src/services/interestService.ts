import { api } from './api';

export type InterestEventType = 'VIEW' | 'REACTION' | 'COMMENT' | 'SHARE' | 'SAVE';

export const interestService = {
  recordEvent: (postId: string, eventType: InterestEventType) =>
    api.post<void>('/interest/events', { postId, eventType }),

  suggestHashtags: (content: string) =>
    api
      .post<{ suggestions: string[] }>('/interest/hashtags/suggest', { content })
      .then((res) => res.suggestions ?? []),
};
