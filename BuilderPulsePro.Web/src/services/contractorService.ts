const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const buildUrl = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl}${normalized}`
}

const buildError = async (response: Response) => {
  const text = await response.text()
  return text || `Request failed (${response.status})`
}

export type ContractorProfile = {
  displayName: string
  trades: string[]
  city?: string | null
  state?: string | null
  zip?: string | null
  lat: number
  lng: number
  serviceRadiusMeters: number
  isAvailable: boolean
  unavailableReason?: string | null
  updatedAt: string
}

export type RecommendedJob = {
  id: string
  title: string
  trade: string
  status: string
  createdAt: string
  city?: string | null
  state?: string | null
  zip?: string | null
  lat: number
  lng: number
  acceptedBidId?: string | null
  completedAt?: string | null
  distanceMeters: number
  hasBidByMe: boolean
}

export type PagedResponse<T> = {
  total: number
  items: T[]
}

export type UpsertContractorProfileRequest = {
  displayName: string
  trades: string[]
  city?: string | null
  state?: string | null
  zip?: string | null
  lat?: number
  lng?: number
  serviceRadiusMeters: number
  isAvailable?: boolean
  unavailableReason?: string | null
}

export type UpdateContractorAvailabilityRequest = {
  isAvailable: boolean
  unavailableReason?: string | null
}

export const getContractorProfile = async (token: string) => {
  const response = await fetch(buildUrl('/contractor/profile'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  return (await response.json()) as ContractorProfile
}

export const upsertContractorProfile = async (token: string, payload: UpsertContractorProfileRequest) => {
  const response = await fetch(buildUrl('/contractor/profile'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  return (await response.json()) as ContractorProfile
}

export const getRecommendedJobs = async (token: string, trade?: string) => {
  const params = new URLSearchParams()
  if (trade) {
    params.set('trade', trade)
  }

  const response = await fetch(
    buildUrl(`/contractor/jobs/recommended${params.toString() ? `?${params.toString()}` : ''}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  return (await response.json()) as PagedResponse<RecommendedJob>
}

export const updateContractorAvailability = async (token: string, payload: UpdateContractorAvailabilityRequest) => {
  const response = await fetch(buildUrl('/contractor/profile/availability'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  return (await response.json()) as ContractorProfile
}
