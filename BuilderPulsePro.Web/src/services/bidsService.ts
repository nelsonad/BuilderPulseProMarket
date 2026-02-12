import { requestJson } from './apiClient'

export type BidLineItem = {
  id: string
  bidId: string
  description: string
  quantity: number
  unitPriceCents: number
  totalCents: number
  sortOrder: number
}

export type BidVariantLineItem = {
  id: string
  bidVariantId: string
  description: string
  quantity: number
  unitPriceCents: number
  totalCents: number
  sortOrder: number
}

export type BidLineItemRequest = {
  description: string
  quantity: number
  unitPriceCents: number
}

export type BidVariant = {
  id: string
  bidId: string
  name: string
  amountCents: number
  notes?: string | null
  sortOrder: number
  lineItems: BidVariantLineItem[]
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
  lineItems: BidLineItem[]
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
  lineItems?: BidLineItemRequest[] | null
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
  lineItems: BidLineItem[]
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

export const getBidsForJob = async (token: string, jobId: string) =>
  requestJson<Bid[]>(`/jobs/${jobId}/bids`, {
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
