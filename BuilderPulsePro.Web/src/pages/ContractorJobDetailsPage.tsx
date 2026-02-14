import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Stack,
  Tabs,
  Tab,
  TextField,
  Typography,
} from '@mui/material'
import AttachmentViewer from '../components/AttachmentViewer'
import BidAttachmentViewer from '../components/BidAttachmentViewer'
import BidAttachmentParsePreviewDialog from '../components/BidAttachmentParsePreviewDialog'
import JobMessagesPanel from '../components/JobMessagesPanel'
import {
  createBid,
  type BidAttachment,
  type BidAttachmentParseJob,
  type BidAttachmentParseResult,
  type BidRevision,
  type MyBid,
  getBid,
  getBidAttachmentParseJobs,
  getBidAttachments,
  getBidRevisions,
  getMyBids,
  parseBidAttachmentPreview,
  regenerateBidAttachmentParse,
  startBidAttachmentParse,
  updateBid,
  uploadBidAttachments,
  withdrawBid,
} from '../services/bidsService'
import { getJob, getJobAttachments, type Job, type JobAttachment } from '../services/jobsService'
import { getAuthToken, setAuthRedirect } from '../services/storageService'

function ContractorJobDetailsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [job, setJob] = useState<Job | null>(null)
  const [attachments, setAttachments] = useState<JobAttachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [bids, setBids] = useState<MyBid[]>([])
  const [bidsError, setBidsError] = useState('')
  const [bidsLoading, setBidsLoading] = useState(false)
  const [bidAttachments, setBidAttachments] = useState<Record<string, BidAttachment[]>>({})
  const [pendingBidAttachments, setPendingBidAttachments] = useState<Record<string, File[]>>({})
  const [bidAttachmentUploading, setBidAttachmentUploading] = useState<string | null>(null)
  const [bidParseStatus, setBidParseStatus] = useState<Record<string, BidAttachmentParseJob | null>>({})
  const [startParseBidId, setStartParseBidId] = useState<string | null>(null)
  const [startParseAttachmentId, setStartParseAttachmentId] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidNotes, setBidNotes] = useState('')
  const [bidEarliestStart, setBidEarliestStart] = useState('')
  const [bidDurationDays, setBidDurationDays] = useState('')
  const [bidValidUntil, setBidValidUntil] = useState('')
  const [bidTerms, setBidTerms] = useState('')
  const [bidAssumptions, setBidAssumptions] = useState('')
  const [bidSubmitting, setBidSubmitting] = useState(false)
  const [bidSuccessMessage, setBidSuccessMessage] = useState('')
  const [bidFormAttachments, setBidFormAttachments] = useState<File[]>([])
  const [bidFormParsing, setBidFormParsing] = useState(false)
  const [bidFormParseResult, setBidFormParseResult] = useState<BidAttachmentParseResult | null>(null)
  const [bidFormPreviewOpen, setBidFormPreviewOpen] = useState(false)
  const [parsePreview, setParsePreview] = useState<{ bidId: string; result: BidAttachmentParseResult } | null>(null)
  const [parseApplying, setParseApplying] = useState(false)
  const [editingBidId, setEditingBidId] = useState<string | null>(null)
  const [withdrawConfirmBidId, setWithdrawConfirmBidId] = useState<string | null>(null)
  const [bidRevisions, setBidRevisions] = useState<BidRevision[]>([])
  const [bidRevisionsLoading, setBidRevisionsLoading] = useState(false)
  const [revisionsForBidId, setRevisionsForBidId] = useState<string | null>(null)

  const buildEmptyParseResult = (): BidAttachmentParseResult => ({
    variants: [],
  })

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

  const handleBidFormAttachmentChange = (files: FileList | null) => {
    if (!files) return
    setBidFormAttachments(Array.from(files))
    setBidFormParseResult(null)
    setBidsError('')
  }

  const handleBidFormParseFile = (file: File) => {
    const token = getAuthToken()
    if (!token || !jobId) return
    setBidsError('')
    setBidFormParsing(true)
    parseBidAttachmentPreview(token, jobId, [file])
      .then((result) => {
        if (result) {
          setBidFormParseResult(result)
        } else {
          setBidFormParseResult(buildEmptyParseResult())
        }
        setBidFormPreviewOpen(true)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Unable to parse bid attachment.'
        setBidsError(message)
        setBidFormParseResult(null)
      })
      .finally(() => setBidFormParsing(false))
  }

  const handleBidFormRemoveFile = (index: number) => {
    setBidFormAttachments((prev) => prev.filter((_, i) => i !== index))
    setBidFormParseResult(null)
  }

  const findParsedResult = (jobs: BidAttachmentParseJob[]) => {
    const completed = jobs.find((job) => job.status === 'Completed' && job.result)
    return completed?.result ?? null
  }

  const getLatestParseJob = (jobs: BidAttachmentParseJob[]) =>
    jobs.length > 0
      ? jobs.reduce((latest, job) => (job.updatedAt > latest.updatedAt ? job : latest), jobs[0])
      : null

  const applyParsedResult = (result: BidAttachmentParseResult | null) => {
    if (!result) {
      return
    }

    if (result.amountCents && result.amountCents > 0) {
      setBidAmount((result.amountCents / 100).toFixed(2))
    }

    if (result.earliestStart) {
      setBidEarliestStart(result.earliestStart.slice(0, 10))
    }

    if (result.durationDays) {
      setBidDurationDays(result.durationDays.toString())
    }

    if (result.validUntil) {
      setBidValidUntil(result.validUntil.slice(0, 10))
    }

    if (result.terms) {
      setBidTerms(result.terms)
    }

    if (result.assumptions) {
      setBidAssumptions(result.assumptions)
    }

    if (result.notes?.trim()) {
      setBidNotes((prev) =>
        prev.trim()
          ? `${prev.trim()}\n\n${result.notes!.trim()}`
          : result.notes!.trim(),
      )
    }
  }

  const pollForParsedResult = async (token: string, jobIdValue: string, bidId: string) => {
    const maxAttempts = 6

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const jobs = await getBidAttachmentParseJobs(token, jobIdValue, bidId)
      const result = findParsedResult(jobs ?? [])
      if (result) {
        return result
      }

      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    return null
  }

  const updateBidFromParsedResult = async (
    token: string,
    jobIdValue: string,
    bidId: string,
    currentBid: MyBid,
    result: BidAttachmentParseResult,
  ) => {
    const notes =
      result.notes?.trim()
        ? currentBid.notes?.trim()
          ? `${currentBid.notes.trim()}\n\n${result.notes.trim()}`
          : result.notes.trim()
        : currentBid.notes ?? null

    const updated = await updateBid(token, jobIdValue, bidId, {
      amountCents: result.amountCents ?? currentBid.amountCents,
      earliestStart: result.earliestStart ?? currentBid.earliestStart ?? null,
      durationDays: result.durationDays ?? currentBid.durationDays ?? null,
      notes,
      validUntil: result.validUntil ?? currentBid.validUntil ?? null,
      terms: result.terms ?? currentBid.terms ?? null,
      assumptions: result.assumptions ?? currentBid.assumptions ?? null,
      variants: null,
    })

    setBids((current) =>
      current.map((bid) =>
        bid.bidId === bidId
          ? {
              ...bid,
              amountCents: updated.amountCents,
              earliestStart: updated.earliestStart,
              durationDays: updated.durationDays,
              notes: updated.notes,
              validUntil: updated.validUntil,
              terms: updated.terms,
              assumptions: updated.assumptions,
              status: updated.status,
            }
          : bid,
      ),
    )
  }

  useEffect(() => {
    if (!jobId) {
      return
    }

    let isActive = true

    const loadJob = async () => {
      setIsLoading(true)
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
      } catch (err) {
        if (!isActive) {
          return
        }
        const message = err instanceof Error ? err.message : 'Unable to load job details.'
        setErrorMessage(message)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
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
      setBidSuccessMessage('')

      try {
        const response = await getMyBids(token, undefined, undefined, 200)
        if (!isActive) {
          return
        }

        const filtered = response.filter((bid) => bid.job.jobId === jobId)
        setBids(filtered)

        const attachments = await Promise.all(
          filtered.map(async (bid) => {
            try {
              const items = await getBidAttachments(token, jobId, bid.bidId)
              return [bid.bidId, items ?? []] as const
            } catch {
              return [bid.bidId, []] as const
            }
          }),
        )

        if (isActive) {
          const attachmentMap = attachments.reduce<Record<string, BidAttachment[]>>((acc, item) => {
            acc[item[0]] = item[1]
            return acc
          }, {})
          setBidAttachments(attachmentMap)
        }
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

  const handleCloseParsePreview = () => {
    if (!parseApplying) {
      setParsePreview(null)
    }
  }

  const handleCloseBidFormPreview = () => {
    if (!parseApplying) {
      setBidFormPreviewOpen(false)
    }
  }

  const handleStartEditBid = async (bidId: string) => {
    const token = getAuthToken()
    if (!token || !jobId) return
    setBidsError('')
    try {
      const bid = await getBid(token, jobId, bidId)
      setBidAmount((bid.amountCents / 100).toFixed(2))
      setBidNotes(bid.notes ?? '')
      setBidEarliestStart(bid.earliestStart ? bid.earliestStart.slice(0, 10) : '')
      setBidDurationDays(bid.durationDays?.toString() ?? '')
      setBidValidUntil(bid.validUntil ? bid.validUntil.slice(0, 10) : '')
      setBidTerms(bid.terms ?? '')
      setBidAssumptions(bid.assumptions ?? '')
      setEditingBidId(bidId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load bid.'
      setBidsError(message)
    }
  }

  const handleCancelEdit = () => {
    setEditingBidId(null)
    setBidAmount('')
    setBidNotes('')
    setBidEarliestStart('')
    setBidDurationDays('')
    setBidValidUntil('')
    setBidTerms('')
    setBidAssumptions('')
  }

  const handleWithdrawBid = async (bidId: string) => {
    const token = getAuthToken()
    if (!token) return
    setBidsError('')
    try {
      const result = await withdrawBid(token, bidId)
      if (jobId) {
        setBids(result.filter((b) => b.job.jobId === jobId))
      }
      setWithdrawConfirmBidId(null)
      setBidSuccessMessage('Bid withdrawn.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to withdraw bid.'
      setBidsError(message)
    }
  }

  useEffect(() => {
    if (!revisionsForBidId || !jobId) {
      setBidRevisions([])
      return
    }
    const token = getAuthToken()
    if (!token) return
    let isActive = true
    setBidRevisionsLoading(true)
    getBidRevisions(token, jobId, revisionsForBidId)
      .then((list) => {
        if (isActive) setBidRevisions(list ?? [])
      })
      .catch(() => {
        if (isActive) setBidRevisions([])
      })
      .finally(() => {
        if (isActive) setBidRevisionsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [revisionsForBidId, jobId])

  const locationLabel = useMemo(() => {
    if (!job) {
      return ''
    }

    const parts = [job.city, job.state, job.zip].filter(
      (value): value is string => Boolean(value && value.trim()),
    )

    if (parts.length > 0) {
      return parts.join(', ')
    }

    return `${job.lat.toFixed(4)}, ${job.lng.toFixed(4)}`
  }, [job])

  const handleBidAttachmentChange = (bidId: string, files: FileList | null) => {
    if (!files) {
      return
    }

    setPendingBidAttachments((current) => ({
      ...current,
      [bidId]: Array.from(files),
    }))
  }

  const handleUploadBidAttachments = async (bidId: string) => {
    if (!jobId) {
      return
    }

    const token = getAuthToken()
    if (!token) {
      setAuthRedirect(location.pathname)
      navigate('/login')
      return
    }

    const files = pendingBidAttachments[bidId]
    if (!files || files.length === 0) {
      return
    }

    setBidAttachmentUploading(bidId)
    setBidsError('')

    try {
      const uploaded = await uploadBidAttachments(token, jobId, bidId, files)
      setBidAttachments((current) => ({
        ...current,
        [bidId]: [...(current[bidId] ?? []), ...(uploaded ?? [])],
      }))
      setPendingBidAttachments((current) => ({
        ...current,
        [bidId]: [],
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to upload bid attachments.'
      setBidsError(message)
    } finally {
      setBidAttachmentUploading(null)
    }
  }

  const handleStartBidParse = async (bidId: string) => {
    const token = getAuthToken()
    if (!token || !jobId) return
    setBidsError('')
    setStartParseBidId(bidId)
    try {
      const jobs = await startBidAttachmentParse(token, jobId, bidId)
      const latest = getLatestParseJob(jobs ?? [])
      setBidParseStatus((current) => ({ ...current, [bidId]: latest ?? null }))
      const parsedResult = await pollForParsedResult(token, jobId, bidId)
      if (parsedResult) {
        const latestJobs = await getBidAttachmentParseJobs(token, jobId, bidId)
        const latestJob = getLatestParseJob(latestJobs ?? [])
        setBidParseStatus((current) => ({ ...current, [bidId]: latestJob ?? null }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start parse.'
      setBidsError(message)
    } finally {
      setStartParseBidId(null)
    }
  }

  const handleStartBidParseAttachment = async (bidId: string, attachmentId: string) => {
    const token = getAuthToken()
    if (!token || !jobId) return
    setBidsError('')
    setStartParseBidId(bidId)
    setStartParseAttachmentId(attachmentId)
    try {
      await regenerateBidAttachmentParse(token, jobId, bidId, attachmentId)
      const parsedResult = await pollForParsedResult(token, jobId, bidId)
      if (parsedResult) {
        const latestJobs = await getBidAttachmentParseJobs(token, jobId, bidId)
        const latestJob = getLatestParseJob(latestJobs ?? [])
        setBidParseStatus((current) => ({ ...current, [bidId]: latestJob ?? null }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to parse attachment.'
      setBidsError(message)
    } finally {
      setStartParseBidId(null)
      setStartParseAttachmentId(null)
    }
  }

  const handleSubmitBid = async () => {
    if (!jobId) {
      setBidsError('Job not found.')
      return
    }

    const token = getAuthToken()
    if (!token) {
      setAuthRedirect(location.pathname)
      navigate('/login')
      return
    }

    setBidsError('')
    setBidSuccessMessage('')

    const amountCents = Math.round(Number.parseFloat(bidAmount) * 100)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setBidsError('Bid amount must be greater than 0.')
      return
    }

    const durationValue = bidDurationDays ? Number.parseInt(bidDurationDays, 10) : undefined
    if (bidDurationDays && (!Number.isFinite(durationValue) || durationValue <= 0)) {
      setBidsError('Duration must be a positive number of days.')
      return
    }

    setBidSubmitting(true)

    const payload = {
      amountCents,
      earliestStart: bidEarliestStart ? new Date(bidEarliestStart).toISOString() : null,
      durationDays: durationValue ?? null,
      notes: bidNotes.trim() || null,
      validUntil: bidValidUntil ? new Date(bidValidUntil).toISOString() : null,
      terms: bidTerms.trim() || null,
      assumptions: bidAssumptions.trim() || null,
      variants: null,
    }

    try {
      if (editingBidId) {
        const bid = await updateBid(token, jobId, editingBidId, payload)
        setBids((current) =>
          current.map((b) =>
            b.bidId === editingBidId
              ? {
                  ...b,
                  amountCents: bid.amountCents,
                  earliestStart: bid.earliestStart,
                  durationDays: bid.durationDays,
                  notes: bid.notes,
                  validUntil: bid.validUntil,
                  terms: bid.terms,
                  assumptions: bid.assumptions,
                  status: bid.status,
                }
              : b,
          ),
        )
        setEditingBidId(null)
        setBidAmount('')
        setBidNotes('')
        setBidEarliestStart('')
        setBidDurationDays('')
        setBidValidUntil('')
        setBidTerms('')
        setBidAssumptions('')
        setBidSuccessMessage('Bid updated.')
      } else {
        const bid = await createBid(token, jobId, payload)

        setBids((current) => {
          const newEntry = {
            bidId: bid.id,
            amountCents: bid.amountCents,
            earliestStart: bid.earliestStart,
            durationDays: bid.durationDays,
            notes: bid.notes,
            validUntil: bid.validUntil,
            terms: bid.terms,
            assumptions: bid.assumptions,
            isAccepted: bid.isAccepted,
            status: bid.status,
            bidCreatedAt: bid.createdAt,
            job: {
              jobId: bid.jobId,
              title: job?.title ?? '',
              trade: job?.trade ?? '',
              status: job?.status ?? '',
              jobCreatedAt: job?.createdAt ?? bid.createdAt,
              postedByUserId: '',
            },
          }
          const withoutThisJob = current.filter((b) => b.job.jobId !== jobId)
          return [...withoutThisJob, newEntry]
        })

        if (bidFormAttachments.length > 0) {
          const uploaded = await uploadBidAttachments(token, jobId, bid.id, bidFormAttachments)
          setBidAttachments((current) => ({
            ...current,
            [bid.id]: uploaded ?? [],
          }))
          setBidFormAttachments([])
        }

        setBidAmount('')
        setBidNotes('')
        setBidEarliestStart('')
        setBidDurationDays('')
        setBidValidUntil('')
        setBidTerms('')
        setBidAssumptions('')
        setBidSuccessMessage('Bid submitted.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (editingBidId ? 'Unable to update bid.' : 'Unable to submit bid.')
      setBidsError(message)
    } finally {
      setBidSubmitting(false)
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

            {isLoading && (
              <Typography color="text.secondary">
                Loading job details...
              </Typography>
            )}
            {errorMessage && <Typography color="error">{errorMessage}</Typography>}

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
                job ? (
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Trade
                    </Typography>
                    <Typography>{job.trade}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography>{formattedCreatedAt || job.createdAt}</Typography>
                    {job.description ? (
                      <>
                        <Typography variant="subtitle2" color="text.secondary">
                          Description
                        </Typography>
                        <Typography>{job.description}</Typography>
                      </>
                    ) : null}
                    <Typography variant="subtitle2" color="text.secondary">
                      Location
                    </Typography>
                    <Typography>{locationLabel}</Typography>
                    <AttachmentViewer attachments={attachments} />
                  </Stack>
                ) : null
              ) : activeTab === 'messages' ? (
                jobId ? (
                  <JobMessagesPanel jobId={jobId} mode="contractor" />
                ) : (
                  <Typography color="text.secondary">
                    Select a job to view messages.
                  </Typography>
                )
              ) : (
                <Stack spacing={2}>
                  {bidsLoading && <Typography color="text.secondary">Loading bids...</Typography>}
                  {bidsError && <Typography color="error">{bidsError}</Typography>}
                  {bidSuccessMessage && <Typography color="success.main">{bidSuccessMessage}</Typography>}
                  {!bidsLoading &&
                  (bids.length === 0 ||
                    editingBidId ||
                    (bids.length === 1 && bids[0].status === 'Withdrawn')) ? (
                    <Card variant="outlined">
                      <CardContent>
                        <Stack spacing={2}>
                          {bids.length === 1 && bids[0].status === 'Withdrawn' && !editingBidId ? (
                            <Typography color="text.secondary">
                              You withdrew your previous bid. You can submit a new bid below.
                            </Typography>
                          ) : null}
                          <Typography fontWeight={600}>
                            {editingBidId ? 'Edit your bid' : 'Submit your bid'}
                          </Typography>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                            <Button variant="outlined" component="label">
                              Add attachments
                              <input
                                hidden
                                type="file"
                                multiple
                                accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.docx,.xlsx,.pptx,.txt,.rtf,.csv,.odt,.ods,.odp"
                                onChange={(event) => handleBidFormAttachmentChange(event.target.files)}
                              />
                            </Button>
                            {bidFormAttachments.length > 0 ? (
                              <Stack spacing={1} sx={{ width: '100%' }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                  Selected files
                                </Typography>
                                {bidFormAttachments.map((file, index) => (
                                  <Stack
                                    key={`${file.name}-${index}`}
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    flexWrap="wrap"
                                  >
                                    <Typography variant="body2" noWrap sx={{ minWidth: 0, flex: '1 1 120px' }}>
                                      {file.name}
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleBidFormParseFile(file)}
                                      disabled={bidFormParsing}
                                    >
                                      {bidFormParsing ? 'Parsing...' : 'Extract bid data'}
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="text"
                                      color="secondary"
                                      onClick={() => handleBidFormRemoveFile(index)}
                                      disabled={bidFormParsing}
                                    >
                                      Remove
                                    </Button>
                                  </Stack>
                                ))}
                              </Stack>
                            ) : null}
                            {bidFormParsing ? (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                              </Stack>
                            ) : null}
                            {bidFormParseResult ? (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => setBidFormPreviewOpen(true)}
                              >
                                Preview results
                              </Button>
                            ) : null}
                          </Stack>
                          <TextField
                            label="Bid amount (USD)"
                            value={bidAmount}
                            onChange={(event) => setBidAmount(event.target.value)}
                            fullWidth
                            inputProps={{ inputMode: 'decimal' }}
                          />
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Earliest start"
                              type="date"
                              value={bidEarliestStart}
                              onChange={(event) => setBidEarliestStart(event.target.value)}
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                            />
                            <TextField
                              label="Duration (days)"
                              value={bidDurationDays}
                              onChange={(event) => setBidDurationDays(event.target.value)}
                              fullWidth
                              inputProps={{ inputMode: 'numeric' }}
                            />
                          </Stack>
                          <TextField
                            label="Valid until"
                            type="date"
                            value={bidValidUntil}
                            onChange={(event) => setBidValidUntil(event.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                          />
                          <TextField
                            label="Notes (e.g. scope of work)"
                            value={bidNotes}
                            onChange={(event) => setBidNotes(event.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
                            placeholder="Describe what?s included in the bid?materials, labor, scope, exclusions, etc."
                          />
                          <TextField
                            label="Terms"
                            value={bidTerms}
                            onChange={(event) => setBidTerms(event.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                          />
                          <TextField
                            label="Assumptions"
                            value={bidAssumptions}
                            onChange={(event) => setBidAssumptions(event.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                          />
                          <Stack direction="row" spacing={2}>
                            {editingBidId ? (
                              <>
                                <Button variant="outlined" onClick={handleCancelEdit} disabled={bidSubmitting}>
                                  Cancel
                                </Button>
                                <Button
                                  variant="contained"
                                  onClick={handleSubmitBid}
                                  disabled={bidSubmitting}
                                >
                                  Save changes
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="contained"
                                onClick={handleSubmitBid}
                                disabled={bidSubmitting}
                              >
                                Submit bid
                              </Button>
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ) : null}
                  {!bidsLoading &&
                  bids.length > 0 &&
                  !editingBidId &&
                  !(bids.length === 1 && bids[0].status === 'Withdrawn') ? (
                    <Stack spacing={2}>
                      {bids.map((bid) => {
                        const attachments = bidAttachments[bid.bidId] ?? []
                        const pendingAttachments = pendingBidAttachments[bid.bidId] ?? []
                        const canUpload = !['Accepted', 'Rejected', 'Withdrawn'].includes(bid.status)
                        const parseJob = bidParseStatus[bid.bidId]
                        const isParsing = parseJob?.status === 'Processing' || parseJob?.status === 'Pending'
                        const hasParsedResult = parseJob?.status === 'Completed' && Boolean(parseJob.result)

                        return (
                          <Card key={bid.bidId} variant="outlined">
                            <CardContent>
                              <Stack spacing={2}>
                                <Typography fontWeight={600}>Your bid</Typography>
                                <Stack spacing={1}>
                                  <Typography variant="subtitle2" color="text.secondary">
                                    Bid attachments
                                  </Typography>
                                  <BidAttachmentViewer attachments={attachments} />
                                  {attachments.length > 0 ? (
                                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        Extract bid data from one file:
                                      </Typography>
                                      {attachments.map((att) => {
                                        const parsingThis =
                                          startParseBidId === bid.bidId && startParseAttachmentId === att.id
                                        return (
                                          <Stack
                                            key={att.id}
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}
                                            flexWrap="wrap"
                                          >
                                            <Typography variant="body2" noWrap sx={{ minWidth: 0, flex: '1 1 120px' }}>
                                              {att.fileName}
                                            </Typography>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              onClick={() => handleStartBidParseAttachment(bid.bidId, att.id)}
                                              disabled={
                                                startParseBidId === bid.bidId ||
                                                (parseJob && (parseJob.status === 'Pending' || parseJob.status === 'Processing'))
                                              }
                                            >
                                              {parsingThis ? 'Parsing...' : 'Extract bid data'}
                                            </Button>
                                            {parsingThis ? (
                                              <CircularProgress size={14} sx={{ color: 'primary.main' }} />
                                            ) : null}
                                          </Stack>
                                        )
                                      })}
                                    </Stack>
                                  ) : null}
                                  {attachments.length > 0 &&
                                  !hasParsedResult &&
                                  !(parseJob && (parseJob.status === 'Pending' || parseJob.status === 'Processing')) &&
                                  startParseBidId !== bid.bidId ? (
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() => handleStartBidParse(bid.bidId)}
                                    >
                                      Extract from all attachments
                                    </Button>
                                  ) : null}
                                  {(parseJob && (parseJob.status === 'Pending' || parseJob.status === 'Processing')) ||
                                  (startParseBidId === bid.bidId && !startParseAttachmentId) ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                                      <Typography color="text.secondary" variant="body2">
                                        Parsing...
                                      </Typography>
                                    </Stack>
                                  ) : null}
                                  {parseJob && parseJob.errorMessage ? (
                                    <Typography color="error" variant="body2">
                                      {parseJob.errorMessage}
                                    </Typography>
                                  ) : null}
                                  {hasParsedResult && parseJob?.result ? (
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() =>
                                        setParsePreview({ bidId: bid.bidId, result: parseJob.result! })
                                      }
                                    >
                                      Preview results
                                    </Button>
                                  ) : null}
                                  {canUpload ? (
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                                      <Button variant="outlined" component="label" size="small">
                                        Add attachments
                                        <input
                                          hidden
                                          type="file"
                                          multiple
                                          accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.docx,.xlsx,.pptx,.txt,.rtf,.csv,.odt,.ods,.odp"
                                          onChange={(event) =>
                                            handleBidAttachmentChange(bid.bidId, event.target.files)
                                          }
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
                                        size="small"
                                        onClick={() => handleUploadBidAttachments(bid.bidId)}
                                        disabled={
                                          bidAttachmentUploading === bid.bidId ||
                                          pendingAttachments.length === 0
                                        }
                                      >
                                        Upload
                                      </Button>
                                    </Stack>
                                  ) : null}
                                </Stack>
                                <Stack spacing={1}>
                                  <Typography color="text.secondary">
                                    Amount: {formatCurrency(bid.amountCents)}
                                  </Typography>
                                  <Typography color="text.secondary">Status: {bid.status}</Typography>
                                  {bid.durationDays ? (
                                    <Typography color="text.secondary">
                                      Duration: {bid.durationDays} days
                                    </Typography>
                                  ) : null}
                                  {bid.earliestStart ? (
                                    <Typography color="text.secondary">
                                      Earliest start: {new Date(bid.earliestStart).toLocaleDateString('en-US')}
                                    </Typography>
                                  ) : null}
                                  {bid.notes ? (
                                    <Typography color="text.secondary">Notes: {bid.notes}</Typography>
                                  ) : null}
                                </Stack>
                                {job?.status === 'Open' &&
                                !['Accepted', 'Rejected', 'Withdrawn'].includes(bid.status) ? (
                                  <Stack direction="row" spacing={2}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleStartEditBid(bid.bidId)}
                                    >
                                      Edit bid
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      onClick={() => setWithdrawConfirmBidId(bid.bidId)}
                                    >
                                      Withdraw bid
                                    </Button>
                                  </Stack>
                                ) : null}
                                <Stack spacing={1}>
                                  {revisionsForBidId !== bid.bidId ? (
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() => setRevisionsForBidId(bid.bidId)}
                                    >
                                      Revision history
                                    </Button>
                                  ) : (
                                    <>
                                      <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                          Revision history
                                        </Typography>
                                        <Button
                                          size="small"
                                          variant="text"
                                          onClick={() => setRevisionsForBidId(null)}
                                        >
                                          Hide
                                        </Button>
                                      </Stack>
                                      {bidRevisionsLoading ? (
                                        <Typography variant="body2" color="text.secondary">
                                          Loading...
                                        </Typography>
                                      ) : bidRevisions.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">
                                          No revisions.
                                        </Typography>
                                      ) : (
                                        <Stack spacing={1}>
                                          {bidRevisions.map((rev) => (
                                            <Card key={rev.id} variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                                              <CardContent>
                                                <Stack spacing={0.5}>
                                                  <Typography variant="subtitle2">
                                                    Revision {rev.revisionNumber} ?{' '}
                                                    {new Date(rev.createdAt).toLocaleString('en-US')}
                                                  </Typography>
                                                  <Typography variant="body2" color="text.secondary">
                                                    Amount: {formatCurrency(rev.amountCents)}
                                                  </Typography>
                                                  {rev.notes ? (
                                                    <Typography variant="body2" color="text.secondary">
                                                      Notes: {rev.notes}
                                                    </Typography>
                                                  ) : null}
                                                </Stack>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </Stack>
                                      )}
                                    </>
                                  )}
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </Stack>
                  ) : null}
                </Stack>
              )}
            </Stack>

            <Stack spacing={1}>
              <Link component={RouterLink} to="/contractor-dashboard">
                Back to dashboard
              </Link>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <Dialog
        open={withdrawConfirmBidId !== null}
        onClose={() => setWithdrawConfirmBidId(null)}
        aria-labelledby="withdraw-dialog-title"
        aria-describedby="withdraw-dialog-description"
      >
        <DialogTitle id="withdraw-dialog-title">Withdraw bid?</DialogTitle>
        <DialogContent>
          <DialogContentText id="withdraw-dialog-description">
            The client will no longer see this bid. You can submit a new bid for this job if it is still open.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawConfirmBidId(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => withdrawConfirmBidId && handleWithdrawBid(withdrawConfirmBidId)}
            autoFocus
          >
            Withdraw bid
          </Button>
        </DialogActions>
      </Dialog>
      <BidAttachmentParsePreviewDialog
        open={Boolean(parsePreview)}
        result={parsePreview?.result ?? null}
        applying={parseApplying}
        onClose={handleCloseParsePreview}
        onApply={async () => {
          if (!parsePreview || !jobId) {
            return
          }

          const token = getAuthToken()
          if (!token) {
            setAuthRedirect(location.pathname)
            navigate('/login')
            return
          }

          const bidToUpdate = bids.find((bid) => bid.bidId === parsePreview.bidId)
          if (!bidToUpdate) {
            return
          }

          setParseApplying(true)
          try {
            await updateBidFromParsedResult(
              token,
              jobId,
              parsePreview.bidId,
              bidToUpdate,
              parsePreview.result,
            )
            setBidSuccessMessage('Parsed data applied to your bid.')
            setParsePreview(null)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to apply parsed bid data.'
            setBidsError(message)
          } finally {
            setParseApplying(false)
          }
        }}
      />
      <BidAttachmentParsePreviewDialog
        open={bidFormPreviewOpen}
        result={bidFormParseResult}
        applying={parseApplying}
        onClose={handleCloseBidFormPreview}
        onApply={() => {
          if (!bidFormParseResult) {
            return
          }

          applyParsedResult(bidFormParseResult)
          setBidFormPreviewOpen(false)
        }}
      />
    </Container>
  )
}

export default ContractorJobDetailsPage