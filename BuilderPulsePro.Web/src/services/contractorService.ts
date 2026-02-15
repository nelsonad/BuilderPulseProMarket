const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const buildUrl = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl}${normalized}`
}

const buildError = async (response: Response) => {
  const text = await response.text()
  return text || `Request failed (${response.status})`
}

/** Service area in API responses (center resolved from zip at save time). */
export type ServiceAreaItem = {
  lat: number
  lng: number
  radiusMeters: number
  label?: string | null
  zip?: string | null
}

/** Service area in upsert requests: zip is looked up to get lat/lng (same pattern as main location). */
export type ServiceAreaRequestItem = {
  zip: string
  radiusMeters: number
  label?: string | null
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
  serviceAreas: ServiceAreaItem[]
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
  /** When provided, replaces all service areas (each uses zip for lat/lng lookup). When omitted, single area from profile zip + serviceRadiusMeters is used. */
  serviceAreas?: ServiceAreaRequestItem[] | null
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

export type AuthorizedUserItem = {
  userId: string
  email: string
}

/** List authorized users (profile owner only). Returns null if not owner (403). */
export const getAuthorizedUsers = async (token: string): Promise<AuthorizedUserItem[] | null> => {
  const response = await fetch(buildUrl('/contractor/profile/authorized-users'), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 403) return null
  if (!response.ok) throw new Error(await buildError(response))

  return (await response.json()) as AuthorizedUserItem[]
}

/** Add an authorized user by email (profile owner only). */
export const addAuthorizedUser = async (token: string, email: string): Promise<AuthorizedUserItem[]> => {
  const response = await fetch(buildUrl('/contractor/profile/authorized-users'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email: email.trim() }),
  })

  if (!response.ok) throw new Error(await buildError(response))

  return (await response.json()) as AuthorizedUserItem[]
}

/** Remove an authorized user (profile owner only). */
export const removeAuthorizedUser = async (token: string, authorizedUserId: string): Promise<void> => {
  const response = await fetch(buildUrl(`/contractor/profile/authorized-users/${authorizedUserId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 404) throw new Error('Authorized user not found.')
  if (!response.ok) throw new Error(await buildError(response))
}
