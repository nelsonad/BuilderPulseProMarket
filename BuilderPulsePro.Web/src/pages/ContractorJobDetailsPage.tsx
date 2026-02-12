import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  Tabs,
  Tab,
  Typography,
} from '@mui/material'
import AttachmentViewer from '../components/AttachmentViewer'
import JobMessagesPanel from '../components/JobMessagesPanel'
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
                <Typography color="text.secondary">
                  Bids will appear here once available.
                </Typography>
              )}
            </Stack>

            <AttachmentViewer attachments={attachments} />

            <Stack spacing={1}>
              <Link component={RouterLink} to="/contractor-dashboard">
                Back to dashboard
              </Link>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default ContractorJobDetailsPage