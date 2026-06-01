import { api } from '@/services/api';
import type { PublicPolicyResponse } from '@/types/policy';

export const policyService = {
  getPublicPolicies: () =>
    api.get<PublicPolicyResponse>('/v1/policies/public'),
};
