export interface PublicCommunityRule {
  id: string;
  label: string;
  description: string;
  severity: string;
}

export type RateLimitWindowUnit = 'minute' | 'hour' | 'day';

export interface PublicPostPolicy {
  maxPostLength: number;
  maxImagesPerPost: number;
  maxVideoMb: number;
  allowedFileTypes: string;
  postsPerMinute: number;
  postRateLimitWindowValue?: number;
  postRateLimitWindowUnit?: RateLimitWindowUnit;
  editsPerMinute?: number;
  editRateLimitWindowValue?: number;
  editRateLimitWindowUnit?: RateLimitWindowUnit;
}

export interface PublicChatPolicy {
  antiSpamEnabled: boolean;
  blockMaliciousLinks: boolean;
  messagesPerMinute: number;
  aiScanEnabled: boolean;
}

export interface PublicPrivacyPolicy {
  logRetentionDays: number;
  chatRetentionDays: number;
  allowDataExport: boolean;
  allowAccountDeletion: boolean;
  cookiePolicyEnabled: boolean;
  sessionMaxHours: number;
}

export interface PublicPolicyResponse {
  updatedAt?: string;
  communityRules: PublicCommunityRule[];
  postPolicy: PublicPostPolicy;
  chatPolicy: PublicChatPolicy;
  privacy: PublicPrivacyPolicy;
  fullConfig?: Record<string, unknown>;
}
