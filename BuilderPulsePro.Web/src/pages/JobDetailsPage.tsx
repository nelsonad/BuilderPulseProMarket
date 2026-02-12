import { useEffect, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  Container,
  MenuItem,
  Link,
  Stack,
  Tabs,
  Tab,
  TextField,
  Typography,
} from '@mui/material'
import AttachmentViewer from '../components/AttachmentViewer'
import JobMessagesPanel from '../components/JobMessagesPanel'
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
                </Stack>
              ) : activeTab === 'messages' ? (
                jobId ? (
                  <JobMessagesPanel jobId={jobId} mode="client" />
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
            {errorMessage ? <Typography color="error">{errorMessage}</Typography> : null}
            {successMessage ? <Typography color="success.main">{successMessage}</Typography> : null}
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
