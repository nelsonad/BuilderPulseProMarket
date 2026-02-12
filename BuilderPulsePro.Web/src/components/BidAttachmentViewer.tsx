import { Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import type { BidAttachment } from '../services/bidsService'
import AttachmentViewerBase from './AttachmentViewerBase'

type BidAttachmentViewerProps = {
  attachments: BidAttachment[]
  emptyMessage?: string
  onDeleteAttachment?: (attachment: BidAttachment) => void
}

const resolveAttachmentUrl = (attachment: BidAttachment) => {
  if (!attachment.url) {
    return ''
  }

  if (attachment.url.startsWith('http')) {
    return attachment.url
  }

  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  return `${baseUrl}${attachment.url.startsWith('/') ? '' : '/'}${attachment.url}`
}

const resolveDownloadUrl = (attachment: BidAttachment) => {
  const resolvedUrl = resolveAttachmentUrl(attachment)
  if (!resolvedUrl) {
    return ''
  }

  const separator = resolvedUrl.includes('?') ? '&' : '?'
  return `${resolvedUrl}${separator}download=true`
}

function BidAttachmentViewer({
  attachments,
  emptyMessage = 'No bid attachments uploaded yet.',
  onDeleteAttachment,
}: BidAttachmentViewerProps) {
  const [deleteCandidate, setDeleteCandidate] = useState<BidAttachment | null>(null)

  return (
    <>
      <AttachmentViewerBase
        attachments={attachments}
        emptyMessage={emptyMessage}
        resolveUrl={resolveAttachmentUrl}
        resolveDownloadUrl={resolveDownloadUrl}
        onDeleteAttachment={
          onDeleteAttachment
            ? (attachment) => setDeleteCandidate(attachment)
            : undefined
        }
      />
      <Dialog
        open={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete attachment?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{deleteCandidate?.fileName}</Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                if (deleteCandidate && onDeleteAttachment) {
                  onDeleteAttachment(deleteCandidate)
                }
                setDeleteCandidate(null)
              }}
            >
              Delete
            </Button>
            <Button variant="outlined" onClick={() => setDeleteCandidate(null)}>
              Cancel
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BidAttachmentViewer
