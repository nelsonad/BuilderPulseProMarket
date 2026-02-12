import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'

export type AttachmentViewerItem = {
  id: string
  fileName: string
  url?: string | null
}

type AttachmentViewerBaseProps<T extends AttachmentViewerItem> = {
  attachments: T[]
  emptyMessage?: string
  resolveUrl: (attachment: T) => string
  resolveDownloadUrl: (attachment: T) => string
  fetchAttachmentBlob?: (attachment: T, download: boolean) => Promise<Blob | null>
  onDeleteAttachment?: (attachment: T) => void
}

const previewableExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'pdf'])

const isPreviewable = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return previewableExtensions.has(ext)
}

function AttachmentViewerBase<T extends AttachmentViewerItem>({
  attachments,
  emptyMessage = 'No attachments yet.',
  resolveUrl,
  resolveDownloadUrl,
  fetchAttachmentBlob,
  onDeleteAttachment,
}: AttachmentViewerBaseProps<T>) {
  const [selectedAttachment, setSelectedAttachment] = useState<T | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const resolvedAttachmentUrl = useMemo(() => {
    if (!selectedAttachment) {
      return ''
    }

    return fetchAttachmentBlob ? previewUrl ?? '' : resolveUrl(selectedAttachment)
  }, [fetchAttachmentBlob, previewUrl, resolveUrl, selectedAttachment])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const openPreview = async (attachment: T) => {
    if (fetchAttachmentBlob) {
      const blob = await fetchAttachmentBlob(attachment, false)
      if (!blob) {
        return
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      const nextUrl = URL.createObjectURL(blob)
      setPreviewUrl(nextUrl)
      setSelectedAttachment(attachment)
      return
    }

    setSelectedAttachment(attachment)
  }

  const downloadAttachment = async (attachment: T) => {
    if (fetchAttachmentBlob) {
      const blob = await fetchAttachmentBlob(attachment, true)
      if (!blob) {
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.fileName
      link.click()
      URL.revokeObjectURL(url)
      return
    }

    const resolvedUrl = resolveDownloadUrl(attachment)
    if (!resolvedUrl) {
      return
    }

    window.open(resolvedUrl, '_blank', 'noopener')
  }

  const handleAttachmentClick = (attachment: T) => {
    if (isPreviewable(attachment.fileName)) {
      void openPreview(attachment)
      return
    }

    void downloadAttachment(attachment)
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
                <Button variant="outlined" size="small" onClick={() => handleAttachmentClick(attachment)}>
                  {attachment.fileName}
                </Button>
                {onDeleteAttachment ? (
                  <Button
                    color="error"
                    variant="text"
                    onClick={() => onDeleteAttachment(attachment)}
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
        onClose={() => {
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
          }
          setSelectedAttachment(null)
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{selectedAttachment?.fileName}</Typography>
            <Box>
              {selectedAttachment && resolvedAttachmentUrl ? (
                <IconButton
                  aria-label="Download attachment"
                  onClick={() => {
                    if (selectedAttachment) {
                      void downloadAttachment(selectedAttachment)
                    }
                  }}
                >
                  <DownloadIcon />
                </IconButton>
              ) : null}
              <IconButton
                onClick={() => {
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl)
                    setPreviewUrl(null)
                  }
                  setSelectedAttachment(null)
                }}
                aria-label="Close"
              >
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
    </>
  )
}

export default AttachmentViewerBase
