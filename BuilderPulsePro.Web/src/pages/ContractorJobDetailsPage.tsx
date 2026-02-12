import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
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
  type BidLineItemRequest,
  type MyBid,
  getBidAttachmentParseJobs,
  getBidAttachments,
  getMyBids,
  parseBidAttachmentPreview,
  updateBid,
  uploadBidAttachments,
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
  const [bidLineItems, setBidLineItems] = useState<
    { id: string; description: string; quantity: string; unitPrice: string }[]
  >([])

  const buildEmptyParseResult = (): BidAttachmentParseResult => ({
    lineItems: [],
    variants: [],
  })

  const toBidLineItemRequest = (items: typeof bidLineItems): BidLineItemRequest[] =>
    items
      .map((item) => ({
        description: item.description.trim(),
        quantity: Number.parseInt(item.quantity, 10),
        unitPriceCents: Math.round(Number.parseFloat(item.unitPrice) * 100),
      }))
      .filter(
        (item) =>
          item.description.length > 0 &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0 &&
          Number.isFinite(item.unitPriceCents) &&
          item.unitPriceCents > 0,
      )

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
    if (!files) {
      return
    }

    const nextFiles = Array.from(files)
    setBidFormAttachments(nextFiles)

    const token = getAuthToken()
    if (!token || !jobId) {
      return
    }

    setBidsError('')
    setBidFormParsing(true)

    parseBidAttachmentPreview(token, jobId, nextFiles)
      .then((result) => {
        if (result) {
          applyParsedResult(result)
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
        setBidFormPreviewOpen(false)
      })
      .finally(() => {
        setBidFormParsing(false)
      })
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

    if (result.lineItems.length > 0) {
      setBidLineItems(
        result.lineItems.map((item) => ({
          id: crypto.randomUUID(),
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: (item.unitPriceCents / 100).toFixed(2),
        })),
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
    const lineItems = result.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    }))

    const updated = await updateBid(token, jobIdValue, bidId, {
      amountCents: result.amountCents ?? currentBid.amountCents,
      earliestStart: result.earliestStart ?? currentBid.earliestStart ?? null,
      durationDays: result.durationDays ?? currentBid.durationDays ?? null,
      notes: currentBid.notes ?? null,
      validUntil: result.validUntil ?? currentBid.validUntil ?? null,
      terms: result.terms ?? currentBid.terms ?? null,
      assumptions: result.assumptions ?? currentBid.assumptions ?? null,
      lineItems: lineItems.length > 0 ? lineItems : null,
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

      setBidParseStatus((current) => ({
        ...current,
        [bidId]: {
          id: '',
          bidId,
          attachmentId: '',
          status: 'Processing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          errorMessage: null,
          result: null,
        },
      }))

      const parsedResult = await pollForParsedResult(token, jobId, bidId)
      if (parsedResult) {
        const latestJobs = await getBidAttachmentParseJobs(token, jobId, bidId)
        const latest = getLatestParseJob(latestJobs ?? [])
        setBidParseStatus((current) => ({
          ...current,
          [bidId]: latest,
        }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to upload bid attachments.'
      setBidsError(message)
    } finally {
      setBidAttachmentUploading(null)
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

    const lineItemsPayload = toBidLineItemRequest(bidLineItems)
    const lineItemsTotal =
      lineItemsPayload.length > 0
        ? lineItemsPayload.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0)
        : null

    const amountValue = Number.parseFloat(bidAmount)
    if ((lineItemsTotal ?? Math.round(amountValue * 100)) <= 0 || (!lineItemsTotal && !Number.isFinite(amountValue))) {
      setBidsError('Bid amount must be greater than 0.')
      return
    }

    const durationValue = bidDurationDays ? Number.parseInt(bidDurationDays, 10) : undefined
    if (bidDurationDays && (!Number.isFinite(durationValue) || durationValue <= 0)) {
      setBidsError('Duration must be a positive number of days.')
      return
    }

    setBidSubmitting(true)

    try {
      const bid = await createBid(token, jobId, {
        amountCents: lineItemsTotal ?? Math.round(amountValue * 100),
        earliestStart: bidEarliestStart ? new Date(bidEarliestStart).toISOString() : null,
        durationDays: durationValue ?? null,
        notes: bidNotes.trim() || null,
        validUntil: bidValidUntil ? new Date(bidValidUntil).toISOString() : null,
        terms: bidTerms.trim() || null,
        assumptions: bidAssumptions.trim() || null,
        lineItems: lineItemsPayload.length > 0 ? lineItemsPayload : null,
        variants: null,
      })

      setBids((current) => [...current, {
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
      }])

      if (bidFormAttachments.length > 0) {
        const uploaded = await uploadBidAttachments(token, jobId, bid.id, bidFormAttachments)
        setBidAttachments((current) => ({
          ...current,
          [bid.id]: uploaded ?? [],
        }))
        setBidFormAttachments([])

        setBidParseStatus((current) => ({
          ...current,
          [bid.id]: {
            id: '',
            bidId: bid.id,
            attachmentId: '',
            status: 'Processing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            errorMessage: null,
            result: null,
          },
        }))

        const parsedResult = await pollForParsedResult(token, jobId, bid.id)
        if (parsedResult) {
          const latestJobs = await getBidAttachmentParseJobs(token, jobId, bid.id)
          const latest = getLatestParseJob(latestJobs ?? [])
          setBidParseStatus((current) => ({
            ...current,
            [bid.id]: latest,
          }))
        }
      }

      setBidAmount('')
      setBidNotes('')
      setBidEarliestStart('')
      setBidDurationDays('')
      setBidValidUntil('')
      setBidTerms('')
      setBidAssumptions('')
      setBidLineItems([])
      setBidSuccessMessage('Bid submitted.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit bid.'
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
                  {!bidsLoading && bids.length === 0 ? (
                    <Card variant="outlined">
                      <CardContent>
                        <Stack spacing={2}>
                          <Typography fontWeight={600}>Submit your bid</Typography>
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
                            label="Notes"
                            value={bidNotes}
                            onChange={(event) => setBidNotes(event.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
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
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                              <Typography variant="subtitle2" color="text.secondary">
                                Line items
                              </Typography>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() =>
                                  setBidLineItems((current) => [
                                    ...current,
                                    {
                                      id: crypto.randomUUID(),
                                      description: '',
                                      quantity: '',
                                      unitPrice: '',
                                    },
                                  ])
                                }
                              >
                                Add line item
                              </Button>
                            </Stack>
                            {bidLineItems.length === 0 ? (
                              <Typography color="text.secondary" variant="body2">
                                No line items added.
                              </Typography>
                            ) : (
                              <Stack spacing={2}>
                                {bidLineItems.map((item) => (
                                  <Stack key={item.id} spacing={1}>
                                    <TextField
                                      label="Description"
                                      value={item.description}
                                      onChange={(event) =>
                                        setBidLineItems((current) =>
                                          current.map((entry) =>
                                            entry.id === item.id
                                              ? { ...entry, description: event.target.value }
                                              : entry,
                                          ),
                                        )
                                      }
                                      fullWidth
                                    />
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                      <TextField
                                        label="Quantity"
                                        value={item.quantity}
                                        onChange={(event) =>
                                          setBidLineItems((current) =>
                                            current.map((entry) =>
                                              entry.id === item.id
                                                ? { ...entry, quantity: event.target.value }
                                                : entry,
                                            ),
                                          )
                                        }
                                        inputProps={{ inputMode: 'numeric' }}
                                        fullWidth
                                      />
                                      <TextField
                                        label="Unit price (USD)"
                                        value={item.unitPrice}
                                        onChange={(event) =>
                                          setBidLineItems((current) =>
                                            current.map((entry) =>
                                              entry.id === item.id
                                                ? { ...entry, unitPrice: event.target.value }
                                                : entry,
                                            ),
                                          )
                                        }
                                        inputProps={{ inputMode: 'decimal' }}
                                        fullWidth
                                      />
                                    </Stack>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="text"
                                      onClick={() =>
                                        setBidLineItems((current) =>
                                          current.filter((entry) => entry.id !== item.id),
                                        )
                                      }
                                    >
                                      Remove line item
                                    </Button>
                                  </Stack>
                                ))}
                              </Stack>
                            )}
                          </Stack>
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
                              <Typography color="text.secondary" variant="body2">
                                {bidFormAttachments.length} attachment
                                {bidFormAttachments.length > 1 ? 's' : ''} selected
                              </Typography>
                            ) : null}
                            {bidFormParsing ? (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                                <Typography color="text.secondary" variant="body2">
                                  Parsing attachment...
                                </Typography>
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
                          <Button
                            variant="contained"
                            onClick={handleSubmitBid}
                            disabled={bidSubmitting}
                          >
                            Submit bid
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ) : null}
                  {!bidsLoading && bids.length > 0 ? (
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
                                <Stack spacing={1}>
                                  <Typography fontWeight={600}>Your bid</Typography>
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
                                <Stack spacing={1}>
                                  <Typography variant="subtitle2" color="text.secondary">
                                    Bid attachments
                                  </Typography>
                                  <BidAttachmentViewer attachments={attachments} />
                                  {parseJob ? (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      {isParsing ? (
                                        <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                                      ) : null}
                                      <Typography color="text.secondary" variant="body2">
                                        Parse status: {parseJob.status}
                                        {parseJob.errorMessage ? ` — ${parseJob.errorMessage}` : ''}
                                      </Typography>
                                      {hasParsedResult ? (
                                        <Button
                                          size="small"
                                          variant="text"
                                          onClick={() => {
                                            if (parseJob?.result) {
                                              setParsePreview({ bidId: bid.bidId, result: parseJob.result })
                                            }
                                          }}
                                        >
                                          Preview results
                                        </Button>
                                      ) : null}
                                    </Stack>
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