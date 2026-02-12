import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { HubConnection } from '@microsoft/signalr'
import MessageAttachmentViewer from './MessageAttachmentViewer'
import {
  type ConversationSummary,
  type Message,
  type MessageAttachment,
  createMessagingHubConnection,
  getUserIdFromToken,
  listJobConversations,
  listConversationMessages,
  markConversationRead,
  sendConversationMessage,
} from '../services/messagingService'
import { getAuthToken } from '../services/storageService'

const attachmentAccept =
  '.jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.docx,.xlsx,.pptx,.txt,.rtf,.csv,.odt,.ods,.odp'
const allowedExtensions = new Set(
  attachmentAccept
    .split(',')
    .map((ext) => ext.replace('.', '').trim().toLowerCase())
    .filter(Boolean),
)

type JobMessagesPanelProps = {
  jobId: string
  mode: 'client' | 'contractor'
}

const formatTimestamp = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function JobMessagesPanel({ jobId, mode }: JobMessagesPanelProps) {
  const token = getAuthToken()
  const userId = useMemo(() => getUserIdFromToken(token), [token])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageBody, setMessageBody] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const connectionRef = useRef<HubConnection | null>(null)

  const firstUnreadMessageId = useMemo(() => {
    if (!userId) {
      return null
    }

    return (
      messages.find((message) => message.recipientUserId === userId && !message.readAt)?.messageId ??
      null
    )
  }, [messages, userId])

  const lastSeenMessageId = useMemo(() => {
    if (!userId) {
      return null
    }

    const seenMessages = messages.filter(
      (message) => message.senderUserId === userId && Boolean(message.readAt),
    )

    return seenMessages.length > 0 ? seenMessages[seenMessages.length - 1].messageId : null
  }, [messages, userId])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.contractorProfileId === selectedContractorId) ?? null,
    [conversations, selectedContractorId],
  )

  useEffect(() => {
    if (!token) {
      setErrorMessage('Log in to view messages.')
      return
    }

    if (mode === 'contractor') {
      setSelectedContractorId(userId)
      return
    }

    let isActive = true

    const loadConversations = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await listJobConversations(token, jobId)
        if (!isActive) {
          return
        }

        setConversations(response)
        if (response.length > 0 && !selectedContractorId) {
          setSelectedContractorId(response[0].contractorProfileId)
        }
      } catch (error) {
        if (!isActive) {
          return
        }
        const message = error instanceof Error ? error.message : 'Unable to load conversations.'
        setErrorMessage(message)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadConversations()

    return () => {
      isActive = false
    }
  }, [jobId, mode, selectedContractorId, token, userId])

  useEffect(() => {
    if (!token || !selectedContractorId) {
      return
    }

    let isActive = true

    const loadMessages = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await listConversationMessages(token, jobId, selectedContractorId)
        if (!isActive) {
          return
        }

        setMessages(response)
      } catch (error) {
        if (!isActive) {
          return
        }

        const message = error instanceof Error ? error.message : 'Unable to load messages.'
        setErrorMessage(message)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadMessages()

    return () => {
      isActive = false
    }
  }, [jobId, selectedContractorId, token])

  useEffect(() => {
    if (!token || !selectedContractorId) {
      return
    }

    const connection = createMessagingHubConnection(token)
    connectionRef.current = connection

    connection.on('messageReceived', (message: Message) => {
      if (message.jobId !== jobId || message.contractorProfileId !== selectedContractorId) {
        if (mode === 'client' && message.jobId === jobId) {
          setConversations((current) =>
            current.map((conversation) =>
              conversation.contractorProfileId === message.contractorProfileId
                ? {
                    ...conversation,
                    lastMessageAt: message.createdAt,
                    lastMessagePreview: message.body,
                    unreadCount: conversation.unreadCount + 1,
                  }
                : conversation,
            ),
          )
        }
        return
      }

      setMessages((current) =>
        current.some((item) => item.messageId === message.messageId)
          ? current
          : [...current, message],
      )
      if (mode === 'client') {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.contractorProfileId === message.contractorProfileId
              ? {
                  ...conversation,
                  lastMessageAt: message.createdAt,
                  lastMessagePreview: message.body,
                  unreadCount:
                    message.recipientUserId === userId ? conversation.unreadCount + 1 : 0,
                }
              : conversation,
          ),
        )
      }

      if (message.recipientUserId === userId) {
        markConversationRead(token, jobId, selectedContractorId).catch(() => undefined)
      }
    })

    connection.on('messagesRead', (payload: { readAt: string }) => {
      if (!userId) {
        return
      }

      setMessages((current) =>
        current.map((message) =>
          message.recipientUserId !== userId && !message.readAt
            ? { ...message, readAt: payload.readAt }
            : message,
        ),
      )
    })

    connection
      .start()
      .then(() => connection.invoke('JoinConversation', jobId, selectedContractorId))
      .catch(() => undefined)

    return () => {
      connection.stop().catch(() => undefined)
      connectionRef.current = null
    }
  }, [jobId, mode, selectedContractorId, token, userId])

  useEffect(() => {
    if (!token || !selectedContractorId || !userId) {
      return
    }

    const hasUnread = messages.some(
      (message) => message.recipientUserId === userId && !message.readAt,
    )

    if (!hasUnread) {
      return
    }

    markConversationRead(token, jobId, selectedContractorId)
      .then((payload) => {
        setMessages((current) =>
          current.map((message) =>
            message.recipientUserId === userId && !message.readAt
              ? { ...message, readAt: payload.readAt }
              : message,
          ),
        )
      })
      .catch(() => undefined)
  }, [jobId, messages, selectedContractorId, token, userId])

  const handleSelectConversation = (contractorProfileId: string) => {
    setSelectedContractorId(contractorProfileId)
    setMessages([])
    setErrorMessage('')
  }

  const handleAttachmentChange = (files: FileList | null) => {
    if (!files) {
      return
    }

    const nextFiles = Array.from(files)
    const invalidFile = nextFiles.find((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      return !allowedExtensions.has(ext)
    })

    if (invalidFile) {
      setErrorMessage('One or more attachments are not supported.')
      return
    }

    setPendingAttachments(nextFiles)
  }

  const handleSend = async () => {
    if (!token || !selectedContractorId) {
      return
    }

    setErrorMessage('')
    setIsSending(true)

    try {
      const response = await sendConversationMessage(
        token,
        jobId,
        selectedContractorId,
        messageBody,
        pendingAttachments,
      )
      setMessages((current) =>
        current.some((item) => item.messageId === response.messageId)
          ? current
          : [...current, response],
      )
      setMessageBody('')
      setPendingAttachments([])
      if (mode === 'client') {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.contractorProfileId === response.contractorProfileId
              ? {
                  ...conversation,
                  lastMessageAt: response.createdAt,
                  lastMessagePreview: response.body,
                  unreadCount: 0,
                }
              : conversation,
          ),
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send message.'
      setErrorMessage(message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Stack spacing={2}>
      {errorMessage && <Typography color="error">{errorMessage}</Typography>}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {mode === 'client' ? (
          <Box
            sx={{
              minWidth: { md: 240 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Conversations
              </Typography>
            </Box>
            <List disablePadding>
              {conversations.length === 0 ? (
                <Box sx={{ px: 2, py: 2 }}>
                  <Typography color="text.secondary" variant="body2">
                    No conversations yet.
                  </Typography>
                </Box>
              ) : (
                conversations.map((conversation) => (
                  <ListItemButton
                    key={conversation.conversationId}
                    selected={conversation.contractorProfileId === selectedContractorId}
                    onClick={() => handleSelectConversation(conversation.contractorProfileId)}
                  >
                    <ListItemText
                      primary={conversation.contractorDisplayName}
                      secondary={conversation.lastMessagePreview ?? 'No messages yet.'}
                    />
                    {conversation.unreadCount > 0 ? (
                      <Badge color="primary" badgeContent={conversation.unreadCount} />
                    ) : null}
                  </ListItemButton>
                ))
              )}
            </List>
          </Box>
        ) : null}
        <Stack spacing={2} flex={1}>
          {isLoading ? (
            <Typography color="text.secondary">Loading messages...</Typography>
          ) : null}
          {selectedContractorId ? (
            <Stack spacing={2}>
              <Stack spacing={1}>
                {messages.length === 0 ? (
                  <Typography color="text.secondary">No messages yet.</Typography>
                ) : (
                  messages.map((message) => {
                    const isMine = message.senderUserId === userId
                    const showUnread = message.messageId === firstUnreadMessageId
                    const showSeen = message.messageId === lastSeenMessageId

                    return (
                      <Stack key={message.messageId} spacing={0.5}>
                        {showUnread ? (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Divider sx={{ flex: 1 }} />
                            <Typography variant="caption" color="text.secondary">
                              Unread
                            </Typography>
                            <Divider sx={{ flex: 1 }} />
                          </Stack>
                        ) : null}
                        <Box
                          sx={{
                            alignSelf: isMine ? 'flex-end' : 'flex-start',
                            backgroundColor: isMine ? 'primary.main' : 'grey.100',
                            color: isMine ? 'primary.contrastText' : 'text.primary',
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            maxWidth: '80%',
                          }}
                        >
                          {message.body ? (
                            <Typography variant="body2">{message.body}</Typography>
                          ) : null}
                          {message.attachments.length > 0 ? (
                            <Box
                              sx={{
                                mt: message.body ? 1 : 0,
                                ...(isMine
                                  ? {
                                      '& .MuiTypography-root': {
                                        color: 'common.white',
                                      },
                                      '& .MuiButton-root': {
                                        color: 'common.white',
                                        borderColor: 'rgba(255,255,255,0.6)',
                                      },
                                    }
                                  : null),
                              }}
                            >
                              <MessageAttachmentViewer attachments={message.attachments} />
                            </Box>
                          ) : null}
                        </Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent={isMine ? 'flex-end' : 'flex-start'}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(message.createdAt)}
                          </Typography>
                          {showSeen ? (
                            <Typography variant="caption" color="text.secondary">
                              Seen
                            </Typography>
                          ) : null}
                        </Stack>
                      </Stack>
                    )
                  })
                )}
              </Stack>
              <Divider />
              <Stack spacing={2}>
                <TextField
                  label="Message"
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <Button variant="outlined" component="label">
                    Add attachments
                    <input
                      hidden
                      type="file"
                      multiple
                      accept={attachmentAccept}
                      onChange={(event) => handleAttachmentChange(event.target.files)}
                    />
                  </Button>
                  {pendingAttachments.length > 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      {pendingAttachments.length} attachment
                      {pendingAttachments.length > 1 ? 's' : ''} selected
                    </Typography>
                  ) : null}
                  <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={isSending || (!messageBody.trim() && pendingAttachments.length === 0)}
                  >
                    Send
                  </Button>
                  {pendingAttachments.length > 0 ? (
                    <Button variant="text" onClick={() => setPendingAttachments([])}>
                      Clear attachments
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Stack>
          ) : (
            <Typography color="text.secondary">Select a conversation to view messages.</Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  )
}

export default JobMessagesPanel
