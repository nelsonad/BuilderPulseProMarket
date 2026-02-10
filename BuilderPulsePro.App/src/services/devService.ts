import {requestJson} from './apiClient';

type LatestEmailResponse = {
  body?: string;
};

export const loadLatestEmail = async () =>
  requestJson<LatestEmailResponse>('/dev/emails/latest');
