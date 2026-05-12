import { ReactNode } from 'react';

export type LiveDestination = 'profile' | 'page' | 'group';

export interface LiveDestinationOption {
  id: LiveDestination;
  label: string;
  description: string;
  icon: ReactNode;
}
