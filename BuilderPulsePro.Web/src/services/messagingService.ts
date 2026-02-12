import { HubConnectionBuilder, type HubConnection } from '@microsoft/signalr'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const buildUrl = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl}${normalized}`
}

const buildError = async (response: Response) => {
  const text = await response.text()
  return text || `Request failed (${response.status})`
}

export type ConversationSummary = {
  conversationId: string
  jobId: string
  contractorProfileId: string
  contractorDisplayName: string
  createdAt: string
  lastMessageAt?: string | null
  lastMessagePreview?: string | null
  unreadCount: number
}

export type MessageAttachment = {
  attachmentId: string
  fileName: string
  contentType: string
  sizeBytes: number
  url?: string | null
  createdAt: string
}

export type Message = {
  messageId: string
  conversationId: string
  jobId: string
  clientUserId: string
  contractorProfileId: string
  senderUserId: string
  recipientUserId: string
  body: string
  createdAt: string
  readAt?: string | null
  attachments: MessageAttachment[]
}

export type MarkConversationReadResponse = {
  conversationId: string
  jobId: string
  contractorProfileId: string
  readAt: string
  updatedCount: number
}

export const listJobConversations = async (token: string, jobId: string) => {
  const response = await fetch(buildUrl(`/jobs/${jobId}/conversations`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  return (await response.json()) as ConversationSummary[]
}

export const listContractorConversations = async (token: string) => {
  const response = await fetch(buildUrl('/contractor/conversations'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  return (await response.json()) as ConversationSummary[]
}

export const listConversationMessages = async (token: string, jobId: string, contractorProfileId: string) => {
  const response = await fetch(buildUrl(`/jobs/${jobId}/conversations/${contractorProfileId}/messages`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  return (await response.json()) as Message[]
}

export const sendConversationMessage = async (
  token: string,
  jobId: string,
  contractorProfileId: string,
  body: string,
  attachments: File[],
) => {
  const formData = new FormData()
  formData.append('body', body)
  attachments.forEach((file) => formData.append('files', file))

  const response = await fetch(buildUrl(`/jobs/${jobId}/conversations/${contractorProfileId}/messages`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  return (await response.json()) as Message
}

export const markConversationRead = async (token: string, jobId: string, contractorProfileId: string) => {
  const response = await fetch(buildUrl(`/jobs/${jobId}/conversations/${contractorProfileId}/messages/read`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await buildError(response))
  }

  return (await response.json()) as MarkConversationReadResponse
}

export const createMessagingHubConnection = (token: string) => {
  return new HubConnectionBuilder()
    .withUrl(`${apiBaseUrl}/hubs/messages`, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect()
    .build()
}

export const getUserIdFromToken = (token?: string | null) => {
  if (!token) {
    return null
  }

  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return (
      payload.sub ??
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
      null
    ) as string | null
  } catch {
    return null
  }
}
