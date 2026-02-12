import { Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import type { JobAttachment } from '../services/jobsService'
import AttachmentViewerBase from './AttachmentViewerBase'

type AttachmentViewerProps = {
  attachments: JobAttachment[]
  emptyMessage?: string
  onDeleteAttachment?: (attachment: JobAttachment) => void
}

const resolveAttachmentUrl = (attachment: JobAttachment) => {
  if (!attachment.url) {
    return ''
  }

  if (attachment.url.startsWith('http')) {
    return attachment.url
  }

  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  return `${baseUrl}${attachment.url.startsWith('/') ? '' : '/'}${attachment.url}`
}

const resolveDownloadUrl = (attachment: JobAttachment) => {
  const resolvedUrl = resolveAttachmentUrl(attachment)
  if (!resolvedUrl) {
    return ''
  }

  const separator = resolvedUrl.includes('?') ? '&' : '?'
  return `${resolvedUrl}${separator}download=true`
}

function AttachmentViewer({
  attachments,
  emptyMessage = 'No attachments uploaded yet.',
  onDeleteAttachment,
}: AttachmentViewerProps) {
  const [deleteCandidate, setDeleteCandidate] = useState<JobAttachment | null>(null)

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
          <Typography color="text.secondary">
            {deleteCandidate?.fileName}
          </Typography>
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

export default AttachmentViewer
