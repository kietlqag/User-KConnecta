import { api } from './api';

export type SupportCategory = 'BUG' | 'FEEDBACK' | 'ACCOUNT' | 'OTHER';

export interface CreateSupportPayload {
  category: SupportCategory;
  subject: string;
  message: string;
}

export interface SupportRequestResponse {
  id: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: string;
  contactEmail?: string | null;
  createdAt: string;
}

export const supportService = {
  /** Gửi yêu cầu trợ giúp / hỗ trợ cho admin. */
  sendRequest: (data: CreateSupportPayload) =>
    api.post<SupportRequestResponse>('/support-requests', data),

  /** Lịch sử yêu cầu của chính người dùng. */
  getMine: () => api.get<SupportRequestResponse[]>('/support-requests/mine'),
};
