import { useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import { type JobAttachment } from '../services/jobsService'

const previewableExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'pdf'])

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

const isPreviewable = (attachment: JobAttachment) => {
  const ext = attachment.fileName.split('.').pop()?.toLowerCase() ?? ''
  return previewableExtensions.has(ext)
}

function AttachmentViewer({
  attachments,
  emptyMessage = 'No attachments uploaded yet.',
  onDeleteAttachment,
}: AttachmentViewerProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<JobAttachment | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<JobAttachment | null>(null)

  const resolvedAttachmentUrl = useMemo(() => {
    if (!selectedAttachment) {
      return ''
    }

    return resolveAttachmentUrl(selectedAttachment)
  }, [selectedAttachment])

  const handleAttachmentClick = (attachment: JobAttachment) => {
    if (isPreviewable(attachment)) {
      setSelectedAttachment(attachment)
      return
    }

    const resolvedUrl = resolveDownloadUrl(attachment)
    if (!resolvedUrl) {
      return
    }

    window.open(resolvedUrl, '_blank', 'noopener')
  }

  return (
    <>
      {attachments.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Attachments
          </Typography>
          <Stack spacing={1}>
            {attachments.map((attachment) => (
              <Stack key={attachment.id} direction="row" spacing={1} alignItems="center">
                <Button variant="outlined" onClick={() => handleAttachmentClick(attachment)}>
                  {attachment.fileName}
                </Button>
                {onDeleteAttachment ? (
                  <Button
                    color="error"
                    variant="text"
                    onClick={() => setDeleteCandidate(attachment)}
                  >
                    Delete
                  </Button>
                ) : null}
              </Stack>
            ))}
          </Stack>
        </Stack>
      ) : (
        <Typography color="text.secondary">{emptyMessage}</Typography>
      )}
      <Dialog
        open={Boolean(selectedAttachment)}
        onClose={() => setSelectedAttachment(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{selectedAttachment?.fileName}</Typography>
            <Box>
              {selectedAttachment && resolvedAttachmentUrl ? (
                <IconButton
                  component="a"
                  href={resolveDownloadUrl(selectedAttachment)}
                  download
                  target="_blank"
                  rel="noopener"
                  aria-label="Download attachment"
                >
                  <DownloadIcon />
                </IconButton>
              ) : null}
              <IconButton onClick={() => setSelectedAttachment(null)} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAttachment && resolvedAttachmentUrl ? (
            selectedAttachment.fileName.toLowerCase().endsWith('.pdf') ? (
              <iframe
                title={selectedAttachment.fileName}
                src={resolvedAttachmentUrl}
                style={{ border: 'none', width: '100%', height: 600 }}
              />
            ) : (
              <img
                src={resolvedAttachmentUrl}
                alt={selectedAttachment.fileName}
                style={{ maxWidth: '100%' }}
              />
            )
          ) : null}
        </DialogContent>
      </Dialog>
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
