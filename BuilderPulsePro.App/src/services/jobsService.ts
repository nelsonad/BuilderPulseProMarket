import {Job, JobAttachment} from '../types';
import {requestJson} from './apiClient';

type CreateJobRequest = {
  title: string;
  trade: string;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat: number;
  lng: number;
};

export const getMyJobs = async (token: string) =>
  requestJson<Job[]>('/my/jobs', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const createJob = async (token: string, payload: CreateJobRequest) =>
  requestJson<Job>('/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

export const getJobAttachments = async (jobId: string) =>
  requestJson<JobAttachment[]>(`/jobs/${jobId}/attachments`);
