import { api } from './api';

export interface LiveDestinationItem {
  id: string;
  name: string;
  description?: string | null;
}

export interface LiveDestinationsResponse {
  pages: LiveDestinationItem[];
  groups: LiveDestinationItem[];
}

export const liveService = {
  getDestinations: (userId: string) =>
    api.get<LiveDestinationsResponse>(`/live/destinations?userId=${encodeURIComponent(userId)}`),
};

