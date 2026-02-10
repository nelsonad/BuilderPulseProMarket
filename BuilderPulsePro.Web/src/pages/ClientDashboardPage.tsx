import { useEffect, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import { getAuthToken, setAuthRedirect } from '../services/storageService'
import { type Job, getMyJobs } from '../services/jobsService'

function ClientDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true
    const token = getAuthToken()

    if (!token) {
      setAuthRedirect(location.pathname)
      navigate('/login')
      return
    }

    const loadJobs = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const payload = await getMyJobs(token)
        if (isActive) {
          setJobs(payload)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load jobs.'
        if (isActive) {
          setErrorMessage(message)
          setJobs([])
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadJobs()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Card elevation={3}>
        <CardContent>
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Box flex={1}>
                <Typography variant="overline" color="primary">
                  Client dashboard
                </Typography>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Your active jobs
                </Typography>
                <Typography color="text.secondary">
                  Track jobs you have posted and manage new requests.
                </Typography>
              </Box>
              <Button component={RouterLink} to="/jobs/post" variant="contained" size="small">
                Create new job
              </Button>
            </Stack>
            {isLoading && <Typography color="text.secondary">Loading your jobs...</Typography>}
            {errorMessage && <Typography color="error">{errorMessage}</Typography>}
            {!isLoading && !errorMessage && (
              <Stack spacing={2}>
                {jobs.length === 0 ? (
                  <Typography color="text.secondary">No jobs yet. Create your first job.</Typography>
                ) : (
                  jobs.map(job => (
                    <Card key={job.id} variant="outlined">
                      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                        <div>
                          <Typography fontWeight={600}>{job.title}</Typography>
                          <Typography color="text.secondary">{job.trade}</Typography>
                        </div>
                        <Button component={RouterLink} to={`/jobs/${job.id}`}>
                          View details
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default ClientDashboardPage
