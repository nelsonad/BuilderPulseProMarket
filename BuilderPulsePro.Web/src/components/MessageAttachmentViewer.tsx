import { useMemo } from 'react'
import type { MessageAttachment } from '../services/messagingService'
import { getAuthToken } from '../services/storageService'
import AttachmentViewerBase, { type AttachmentViewerItem } from './AttachmentViewerBase'

type MessageAttachmentViewerProps = {
  attachments: MessageAttachment[]
  emptyMessage?: string
}

const resolveAttachmentUrl = (attachment: MessageAttachment) => {
  if (!attachment.url) {
    return ''
  }

  if (attachment.url.startsWith('http')) {
    return attachment.url
  }

  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  return `${baseUrl}${attachment.url.startsWith('/') ? '' : '/'}${attachment.url}`
}

type MessageAttachmentItem = MessageAttachment & AttachmentViewerItem

const resolveDownloadUrl = (attachment: MessageAttachmentItem) => {
  const resolvedUrl = resolveAttachmentUrl(attachment)
  if (!resolvedUrl) {
    return ''
  }

  const separator = resolvedUrl.includes('?') ? '&' : '?'
  return `${resolvedUrl}${separator}download=true`
}

function MessageAttachmentViewer({ attachments, emptyMessage = 'No attachments yet.' }: MessageAttachmentViewerProps) {
  const token = getAuthToken()
  const items = useMemo<MessageAttachmentItem[]>(
    () => attachments.map((attachment) => ({ ...attachment, id: attachment.attachmentId })),
    [attachments],
  )

  const fetchAttachmentBlob = async (attachment: MessageAttachmentItem, download = false) => {
    const resolvedUrl = download ? resolveDownloadUrl(attachment) : resolveAttachmentUrl(attachment)
    if (!resolvedUrl) {
      return null
    }

    const response = await fetch(resolvedUrl, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    })

    if (!response.ok) {
      return null
    }

    return await response.blob()
  }

  return (
    <AttachmentViewerBase
      attachments={items}
      emptyMessage={emptyMessage}
      resolveUrl={resolveAttachmentUrl}
      resolveDownloadUrl={resolveDownloadUrl}
      fetchAttachmentBlob={fetchAttachmentBlob}
    />
  )
}

export default MessageAttachmentViewer
