import { requestEmpty, requestJson } from './apiClient'

export type Job = {
  id: string
  title: string
  trade: string
  description?: string | null
  status: string
  createdAt: string
  city?: string | null
  state?: string | null
  zip?: string | null
  lat: number
  lng: number
  acceptedBidId?: string | null
  completedAt?: string | null
}

export type JobAttachment = {
  id: string
  jobId: string
  fileName: string
  contentType: string
  sizeBytes: number
  url?: string | null
  createdAt: string
}

type CreateJobRequest = {
  title: string
  trade: string
  description?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  lat: number
  lng: number
}

type UpdateJobRequest = CreateJobRequest

export const getMyJobs = async (token: string) =>
  requestJson<Job[]>('/my/jobs', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const getJob = async (jobId: string) =>
  requestJson<Job>(`/jobs/${jobId}`)

export const getJobAttachments = async (jobId: string) =>
  requestJson<JobAttachment[]>(`/jobs/${jobId}/attachments`)

export const uploadJobAttachments = async (token: string, jobId: string, files: File[]) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  return requestJson<JobAttachment[]>(`/jobs/${jobId}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
}

export const deleteJobAttachment = async (token: string, jobId: string, attachmentId: string) =>
  requestEmpty(`/jobs/${jobId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const createJob = async (token: string, payload: CreateJobRequest) =>
  requestJson<Job>('/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

export const updateJob = async (token: string, jobId: string, payload: UpdateJobRequest) =>
  requestJson<Job>(`/jobs/${jobId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
