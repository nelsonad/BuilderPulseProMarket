import {Job, JobAttachment, PendingAttachment} from '../types';
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

export const uploadJobAttachments = async (
  token: string,
  jobId: string,
  files: PendingAttachment[],
) => {
  const formData = new FormData();
  files.forEach(file =>
    formData.append(
      'files',
      {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as unknown as Blob,
    ),
  );

  return requestJson<JobAttachment[]>(`/jobs/${jobId}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
};
