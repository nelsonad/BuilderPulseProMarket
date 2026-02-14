import { requestEmpty, requestJson } from './apiClient'

export type BidVariant = {
  id: string
  bidId: string
  name: string
  amountCents: number
  notes?: string | null
  sortOrder: number
}

export type Bid = {
  id: string
  jobId: string
  contractorProfileId: string
  amountCents: number
  earliestStart?: string | null
  durationDays?: number | null
  notes: string
  validUntil?: string | null
  terms?: string | null
  assumptions?: string | null
  isAccepted: boolean
  status: string
  createdAt: string
  variants: BidVariant[]
}

export type BidAttachment = {
  id: string
  bidId: string
  fileName: string
  contentType: string
  sizeBytes: number
  url?: string | null
  createdAt: string
}

export type MyBidJobInfo = {
  jobId: string
  title: string
  trade: string
  status: string
  jobCreatedAt: string
  postedByUserId: string
}

export type MyBid = {
  bidId: string
  amountCents: number
  earliestStart?: string | null
  durationDays?: number | null
  notes: string
  validUntil?: string | null
  terms?: string | null
  assumptions?: string | null
  isAccepted: boolean
  status: string
  bidCreatedAt: string
  job: MyBidJobInfo
}

export type CreateBidRequest = {
  amountCents: number
  earliestStart?: string | null
  durationDays?: number | null
  notes?: string | null
  validUntil?: string | null
  terms?: string | null
  assumptions?: string | null
  variants?: never[] | null
}

export type UpdateBidRequest = CreateBidRequest

export type BidAttachmentParseResult = {
  amountCents?: number | null
  earliestStart?: string | null
  durationDays?: number | null
  validUntil?: string | null
  terms?: string | null
  assumptions?: string | null
  notes?: string | null
  variants: BidVariant[]
}

export type BidAttachmentParseJob = {
  id: string
  bidId: string
  attachmentId: string
  status: string
  createdAt: string
  updatedAt: string
  errorMessage?: string | null
  result?: BidAttachmentParseResult | null
}

export type BidRevision = {
  id: string
  bidId: string
  revisionNumber: number
  createdByUserId: string
  createdAt: string
  amountCents: number
  earliestStart?: string | null
  durationDays?: number | null
  notes: string
  validUntil?: string | null
  terms?: string | null
  assumptions?: string | null
  variants: BidVariant[]
}

export const getBidsForJob = async (token: string, jobId: string) =>
  requestJson<Bid[]>(`/jobs/${jobId}/bids`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const getBid = async (token: string, jobId: string, bidId: string) =>
  requestJson<Bid>(`/jobs/${jobId}/bids/${bidId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const getBidRevisions = async (token: string, jobId: string, bidId: string) =>
  requestJson<BidRevision[]>(`/jobs/${jobId}/bids/${bidId}/revisions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const acceptBid = async (token: string, jobId: string, bidId: string) =>
  requestEmpty(`/jobs/${jobId}/bids/${bidId}/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const rejectBid = async (token: string, jobId: string, bidId: string) =>
  requestEmpty(`/jobs/${jobId}/bids/${bidId}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const withdrawBid = async (token: string, bidId: string) =>
  requestJson<MyBid[]>(`/contractor/bids/${bidId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const getMyBids = async (token: string, status?: string, accepted?: boolean, take = 200) => {
  const params = new URLSearchParams()
  if (status) {
    params.set('status', status)
  }
  if (accepted !== undefined) {
    params.set('accepted', accepted ? 'true' : 'false')
  }
  if (take) {
    params.set('take', take.toString())
  }

  return requestJson<MyBid[]>(`/contractor/bids${params.toString() ? `?${params.toString()}` : ''}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export const createBid = async (token: string, jobId: string, payload: CreateBidRequest) =>
  requestJson<Bid>(`/jobs/${jobId}/bids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

export const updateBid = async (token: string, jobId: string, bidId: string, payload: UpdateBidRequest) =>
  requestJson<Bid>(`/jobs/${jobId}/bids/${bidId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

export const getBidAttachments = async (token: string, jobId: string, bidId: string) =>
  requestJson<BidAttachment[]>(`/jobs/${jobId}/bids/${bidId}/attachments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const parseBidAttachmentPreview = async (token: string, jobId: string, files: File[]) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  return requestJson<BidAttachmentParseResult>(`/jobs/${jobId}/bids/parse-preview`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
}

export const uploadBidAttachments = async (
  token: string,
  jobId: string,
  bidId: string,
  files: File[],
) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  return requestJson<BidAttachment[]>(`/jobs/${jobId}/bids/${bidId}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
}

export const getBidAttachmentParseJobs = async (token: string, jobId: string, bidId: string) =>
  requestJson<BidAttachmentParseJob[]>(`/jobs/${jobId}/bids/${bidId}/attachments/parse`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const startBidAttachmentParse = async (token: string, jobId: string, bidId: string) =>
  requestJson<BidAttachmentParseJob[]>(`/jobs/${jobId}/bids/${bidId}/attachments/parse`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

export const regenerateBidAttachmentParse = async (
  token: string,
  jobId: string,
  bidId: string,
  attachmentId: string,
) =>
  requestJson<BidAttachmentParseJob>(`/jobs/${jobId}/bids/${bidId}/attachments/${attachmentId}/parse`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
