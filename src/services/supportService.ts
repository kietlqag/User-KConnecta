import { api } from './api';

export type SupportCategory = 'BUG' | 'FEEDBACK' | 'ACCOUNT' | 'OTHER';
export type SupportStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

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
  status: SupportStatus;
  contactEmail?: string | null;
  createdAt: string;
  attachmentUrls: string[];
}

export const supportService = {
  /** Gửi yêu cầu trợ giúp / hỗ trợ cho admin. */
  sendRequest: (data: CreateSupportPayload, attachments: File[] = []) => {
    const formData = new FormData();
    formData.append('category', data.category);
    formData.append('subject', data.subject);
    formData.append('message', data.message);
    attachments.forEach((file) => formData.append('attachments', file));
    return api.postMultipart<SupportRequestResponse>('/support-requests', formData);
  },

  /** Lịch sử yêu cầu của chính người dùng. */
  getMine: () => api.get<SupportRequestResponse[]>('/support-requests/mine'),
};
