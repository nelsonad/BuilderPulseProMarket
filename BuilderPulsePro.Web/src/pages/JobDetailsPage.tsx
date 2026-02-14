import { useEffect, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Link,
  Stack,
  Tabs,
  Tab,
  TextField,
  Typography,
} from '@mui/material'
import AttachmentViewer from '../components/AttachmentViewer'
import BidAttachmentViewer from '../components/BidAttachmentViewer'
import JobMessagesPanel from '../components/JobMessagesPanel'
import {
  acceptBid,
  type Bid,
  type BidAttachment,
  getBidAttachments,
  getBidsForJob,
  rejectBid,
} from '../services/bidsService'
import { listJobConversations } from '../services/messagingService'
import {
  getJob,
  getJobAttachments,
  type Job,
  type JobAttachment,
  updateJob,
  uploadJobAttachments,
  deleteJobAttachment,
} from '../services/jobsService'
import { getAuthToken, setAuthRedirect } from '../services/storageService'
import { tradeOptions } from '../utils/trades'

function JobDetailsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [job, setJob] = useState<Job | null>(null)
  const [attachments, setAttachments] = useState<JobAttachment[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [title, setTitle] = useState('')
  const [trade, setTrade] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [newAttachments, setNewAttachments] = useState<File[]>([])
  const [activeTab, setActiveTab] = useState('details')
  const [bids, setBids] = useState<Bid[]>([])
  const [bidsError, setBidsError] = useState('')
  const [bidsLoading, setBidsLoading] = useState(false)
  const [contractorLookup, setContractorLookup] = useState<Record<string, string>>({})
  const [messageContractorId, setMessageContractorId] = useState<string | null>(null)
  const [acceptConfirmBidId, setAcceptConfirmBidId] = useState<string | null>(null)
  const [rejectConfirmBidId, setRejectConfirmBidId] = useState<string | null>(null)
  const [bidActionLoading, setBidActionLoading] = useState(false)
  const [bidAttachments, setBidAttachments] = useState<Record<string, BidAttachment[]>>({})

  const formattedCreatedAt = job?.createdAt
    ? new Date(job.createdAt).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : ''

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setAuthRedirect(location.pathname)
      navigate('/login')
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    if (!jobId) {
      return
    }

    let isActive = true

    const loadJob = async () => {
      setErrorMessage('')

      try {
        const [jobResponse, attachmentResponse] = await Promise.all([
          getJob(jobId),
          getJobAttachments(jobId),
        ])

        if (!isActive) {
          return
        }

        setJob(jobResponse)
        setAttachments(attachmentResponse ?? [])
        setTitle(jobResponse.title ?? '')
        setTrade(jobResponse.trade ?? '')
        setDescription(jobResponse.description ?? '')
        setCity(jobResponse.city ?? '')
        setState(jobResponse.state ?? '')
        setZip(jobResponse.zip ?? '')
        setNewAttachments([])
      } catch (err) {
        if (!isActive) {
          return
        }
        const message = err instanceof Error ? err.message : 'Unable to load job details.'
        setErrorMessage(message)
      }
    }

    loadJob()

    return () => {
      isActive = false
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId || activeTab !== 'bids') {
      return
    }

    const token = getAuthToken()
    if (!token) {
      setAuthRedirect(location.pathname)
      navigate('/login')
      return
    }

    let isActive = true

    const loadBids = async () => {
      setBidsLoading(true)
      setBidsError('')

      try {
        const [bidResponse, conversationResponse] = await Promise.all([
          getBidsForJob(token, jobId),
          listJobConversations(token, jobId),
        ])

        if (!isActive) {
          return
        }

        setBids(bidResponse ?? [])
        const bidList = bidResponse ?? []
        const attachmentEntries = await Promise.all(
          bidList.map(async (bid) => {
            const items = await getBidAttachments(token, jobId, bid.id)
            return [bid.id, items] as const
          }),
        )
        const attachmentMap = Object.fromEntries(attachmentEntries) as Record<string, BidAttachment[]>
        setBidAttachments(attachmentMap)
        const lookup = conversationResponse.reduce<Record<string, string>>((acc, conversation) => {
          acc[conversation.contractorProfileId] = conversation.contractorDisplayName
          return acc
        }, {})
        setContractorLookup(lookup)
      } catch (err) {
        if (!isActive) {
          return
        }
        const message = err instanceof Error ? err.message : 'Unable to load bids.'
        setBidsError(message)
      } finally {
        if (isActive) {
          setBidsLoading(false)
        }
      }
    }

    loadBids()

    return () => {
      isActive = false
    }
  }, [activeTab, jobId, location.pathname, navigate])

  const formatCurrency = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`
  const formatDate = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '?'

  const handleAcceptBid = async (bidId: string) => {
    const token = getAuthToken()
    if (!token || !jobId) return
    setBidActionLoading(true)
    setBidsError('')
    try {
      await acceptBid(token, jobId, bidId)
      setAcceptConfirmBidId(null)
      const [jobResponse, bidResponse] = await Promise.all([
        getJob(jobId),
        getBidsForJob(token, jobId),
      ])
      setJob(jobResponse)
      const bidList = bidResponse ?? []
      setBids(bidList)
      const attachmentEntries = await Promise.all(
        bidList.map(async (bid) => {
          const items = await getBidAttachments(token, jobId, bid.id)
          return [bid.id, items] as const
        }),
      )
      setBidAttachments(Object.fromEntries(attachmentEntries) as Record<string, BidAttachment[]>)
      setSuccessMessage('Bid accepted.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to accept bid.'
      setBidsError(message)
    } finally {
      setBidActionLoading(false)
    }
  }

  const handleRejectBid = async (bidId: string) => {
    const token = getAuthToken()
    if (!token || !jobId) return
    setBidActionLoading(true)
    setBidsError('')
    try {
      await rejectBid(token, jobId, bidId)
      setRejectConfirmBidId(null)
      const bidResponse = await getBidsForJob(token, jobId)
      const bidList = bidResponse ?? []
      setBids(bidList)
      const attachmentEntries = await Promise.all(
        bidList.map(async (bid) => {
          const items = await getBidAttachments(token, jobId, bid.id)
          return [bid.id, items] as const
        }),
      )
      setBidAttachments(Object.fromEntries(attachmentEntries) as Record<string, BidAttachment[]>)
      setSuccessMessage('Bid declined.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to decline bid.'
      setBidsError(message)
    } finally {
      setBidActionLoading(false)
    }
  }

  const handleSave = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    if (!jobId) {
      setErrorMessage('Job not found.')
      return
    }

    const token = getAuthToken()
    if (!token) {
      setAuthRedirect(location.pathname)
      navigate('/login')
      return
    }

    if (!title.trim()) {
      setErrorMessage('Title is required.')
      return
    }

    if (!trade.trim()) {
      setErrorMessage('Trade is required.')
      return
    }

    if (!zip.trim()) {
      setErrorMessage('Zip code is required.')
      return
    }

    try {
      const updated = await updateJob(token, jobId, {
        title: title.trim(),
        trade: trade.trim(),
        description: description.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip: zip.trim() || null,
        lat: 0,
        lng: 0,
      })

      if (newAttachments.length > 0) {
        const uploaded = await uploadJobAttachments(token, jobId, newAttachments)
        setAttachments((current) => [...current, ...(uploaded ?? [])])
        setNewAttachments([])
      }
      setJob(updated)
      setSuccessMessage('Job updated.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update job.'
      setErrorMessage(message)
    }
  }


  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Card elevation={3}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="overline" color="primary">
              Job details
            </Typography>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {job?.title ?? `Job ${jobId}`}
            </Typography>
            <Stack spacing={2}>
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  '& .MuiTabs-flexContainer': { gap: 1 },
                  '& .MuiTab-root': {
                    minHeight: 36,
                    paddingX: 2,
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 600,
                  },
                  '& .MuiTabs-indicator': { height: 0 },
                  '& .MuiTab-root.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                  },
                }}
              >
                <Tab label="Details" value="details" />
                <Tab label="Messages" value="messages" />
                <Tab label="Bids" value="bids" />
              </Tabs>
              {activeTab === 'details' ? (
                <Stack spacing={2}>
                  <TextField
                    label="Title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Trade"
                    value={trade}
                    onChange={(event) => setTrade(event.target.value)}
                    select
                    fullWidth
                  >
                    <MenuItem value="" disabled>
                      Select a trade
                    </MenuItem>
                    {tradeOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                  {formattedCreatedAt ? (
                    <TextField
                      label="Created"
                      value={formattedCreatedAt}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  ) : null}
                  <TextField
                    label="City"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="State"
                    value={state}
                    onChange={(event) => setState(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Zip code"
                    value={zip}
                    onChange={(event) => setZip(event.target.value.replace(/\D/g, '').slice(0, 5))}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 5 }}
                    fullWidth
                  />
                  <Button variant="outlined" component="label">
                    Add attachments
                    <input
                      hidden
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.docx,.xlsx,.pptx,.txt,.rtf,.csv,.odt,.ods,.odp"
                      onChange={(event) =>
                        setNewAttachments(Array.from(event.target.files ?? []))
                      }
                    />
                  </Button>
                  {newAttachments.length > 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      {newAttachments.length} attachment{newAttachments.length > 1 ? 's' : ''} selected
                    </Typography>
                  ) : null}
                  <Stack direction="row" spacing={2}>
                    <Button variant="contained" onClick={handleSave}>
                      Save changes
                    </Button>
                  </Stack>
                  <AttachmentViewer
                    attachments={attachments}
                    onDeleteAttachment={async (attachment) => {
                      if (!jobId) {
                        return
                      }

                      const token = getAuthToken()
                      if (!token) {
                        setAuthRedirect(location.pathname)
                        navigate('/login')
                        return
                      }

                      try {
                        await deleteJobAttachment(token, jobId, attachment.id)
                        setAttachments((current) =>
                          current.filter((item) => item.id !== attachment.id),
                        )
                      } catch (err) {
                        const message = err instanceof Error ? err.message : 'Unable to delete attachment.'
                        setErrorMessage(message)
                      }
                    }}
                  />
                </Stack>
              ) : activeTab === 'messages' ? (
                jobId ? (
                  <JobMessagesPanel
                    jobId={jobId}
                    mode="client"
                    initialContractorId={messageContractorId}
                  />
                ) : (
                  <Typography color="text.secondary">
                    Select a job to view messages.
                  </Typography>
                )
              ) : (
                <Stack spacing={2}>
                  {bidsLoading && <Typography color="text.secondary">Loading bids...</Typography>}
                  {bidsError && <Typography color="error">{bidsError}</Typography>}
                  {!bidsLoading && !bidsError && bids.length === 0 ? (
                    <Typography color="text.secondary">No bids yet.</Typography>
                  ) : null}
                  {!bidsLoading && !bidsError && bids.length > 0 ? (
                    <Stack spacing={2}>
                      {bids.map((bid) => (
                        <Card key={bid.id} variant="outlined">
                          <CardContent>
                            <Stack spacing={1}>
                              <Stack spacing={0.5}>
                                <Typography variant="subtitle2" color="text.secondary">
                                  Bid attachments
                                </Typography>
                                <BidAttachmentViewer attachments={bidAttachments[bid.id] ?? []} />
                              </Stack>
                              <Typography fontWeight={600}>
                                {contractorLookup[bid.contractorProfileId] ?? 'Contractor'}
                              </Typography>
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                justifyContent="space-between"
                              >
                                <Stack spacing={0.5}>
                                  <Typography color="text.secondary">
                                    Amount: {formatCurrency(bid.amountCents)}
                                  </Typography>
                                  <Typography color="text.secondary">
                                    Status: {bid.status}
                                  </Typography>
                                  <Typography color="text.secondary">
                                    Valid until: {formatDate(bid.validUntil)}
                                  </Typography>
                                  {bid.durationDays ? (
                                    <Typography color="text.secondary">
                                      Duration: {bid.durationDays} days
                                    </Typography>
                                  ) : null}
                                  {bid.earliestStart ? (
                                    <Typography color="text.secondary">
                                      Earliest start: {formatDate(bid.earliestStart)}
                                    </Typography>
                                  ) : null}
                                </Stack>
                                <Stack spacing={1} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                                  {job?.status === 'Open' &&
                                    !['Accepted', 'Rejected', 'Withdrawn'].includes(bid.status) ? (
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                      <Button
                                        variant="contained"
                                        size="small"
                                        disabled={bidActionLoading}
                                        onClick={() => setAcceptConfirmBidId(bid.id)}
                                      >
                                        Accept bid
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        color="error"
                                        disabled={bidActionLoading}
                                        onClick={() => setRejectConfirmBidId(bid.id)}
                                      >
                                        Decline
                                      </Button>
                                    </Stack>
                                  ) : null}
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                      setMessageContractorId(bid.contractorProfileId)
                                      setActiveTab('messages')
                                    }}
                                  >
                                    Message contractor
                                  </Button>
                                </Stack>
                              </Stack>
                              {bid.notes ? (
                                <Typography color="text.secondary">Notes: {bid.notes}</Typography>
                              ) : null}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : null}
                </Stack>
              )}
            </Stack>
            {errorMessage ? <Typography color="error">{errorMessage}</Typography> : null}
            {successMessage ? <Typography color="success.main">{successMessage}</Typography> : null}
            <Dialog
              open={acceptConfirmBidId !== null}
              onClose={() => !bidActionLoading && setAcceptConfirmBidId(null)}
              aria-labelledby="accept-dialog-title"
              aria-describedby="accept-dialog-description"
            >
              <DialogTitle id="accept-dialog-title">Award this bid?</DialogTitle>
              <DialogContent>
                <DialogContentText id="accept-dialog-description">
                  This contractor will be awarded the job. Other bids will be declined and those contractors will be notified.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAcceptConfirmBidId(null)} disabled={bidActionLoading}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={() => acceptConfirmBidId && handleAcceptBid(acceptConfirmBidId)}
                  disabled={bidActionLoading}
                  autoFocus
                >
                  {bidActionLoading ? 'Accepting?' : 'Accept bid'}
                </Button>
              </DialogActions>
            </Dialog>
            <Dialog
              open={rejectConfirmBidId !== null}
              onClose={() => !bidActionLoading && setRejectConfirmBidId(null)}
              aria-labelledby="reject-dialog-title"
              aria-describedby="reject-dialog-description"
            >
              <DialogTitle id="reject-dialog-title">Decline this bid?</DialogTitle>
              <DialogContent>
                <DialogContentText id="reject-dialog-description">
                  The contractor will be notified that their bid was declined. They will no longer see this as a potential bid.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setRejectConfirmBidId(null)} disabled={bidActionLoading}>
                  Cancel
                </Button>
                <Button
                  color="error"
                  variant="contained"
                  onClick={() => rejectConfirmBidId && handleRejectBid(rejectConfirmBidId)}
                  disabled={bidActionLoading}
                  autoFocus
                >
                  {bidActionLoading ? 'Declining?' : 'Decline bid'}
                </Button>
              </DialogActions>
            </Dialog>
            <Stack spacing={1}>
              <Link component={RouterLink} to="/client-dashboard">
                Back to dashboard
              </Link>
              <Link component={RouterLink} to="/jobs/post">
                Post another job
              </Link>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default JobDetailsPage
