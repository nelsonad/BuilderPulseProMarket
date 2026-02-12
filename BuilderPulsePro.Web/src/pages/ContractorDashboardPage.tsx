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
import {
  type ContractorProfile,
  type RecommendedJob,
  getContractorProfile,
  getRecommendedJobs,
} from '../services/contractorService'

function ContractorDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [jobs, setJobs] = useState<RecommendedJob[]>([])
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

    const loadDashboard = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const contractorProfile = await getContractorProfile(token)
        if (!contractorProfile) {
          navigate('/contractor/profile')
          return
        }

        if (!isActive) {
          return
        }

        setProfile(contractorProfile)
        const recommended = await getRecommendedJobs(token)

        if (isActive) {
          setJobs(recommended.items)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load recommended jobs.'
        if (isActive) {
          setErrorMessage(message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isActive = false
    }
  }, [location.pathname, navigate])

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
                  Contractor dashboard
                </Typography>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Recommended jobs near you
                </Typography>
                <Typography color="text.secondary">
                  {profile
                    ? `Showing opportunities for ${profile.displayName}.`
                    : 'Find projects that match your trades and service area.'}
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                to="/contractor/profile"
                variant="outlined"
                size="small"
              >
                Edit profile
              </Button>
            </Stack>
            {profile && profile.trades.length > 0 ? (
              <Typography color="text.secondary">
                Filtered by trade: {profile.trades.join(', ')}
              </Typography>
            ) : null}
            {isLoading && <Typography color="text.secondary">Loading recommended jobs...</Typography>}
            {errorMessage && <Typography color="error">{errorMessage}</Typography>}
            {!isLoading && !errorMessage && (
              <Stack spacing={2}>
                {jobs.length === 0 ? (
                  <Typography color="text.secondary">No recommended jobs yet. Check back soon.</Typography>
                ) : (
                  jobs.map((job) => (
                    <Card key={job.id} variant="outlined">
                      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                        <div>
                          <Typography fontWeight={600}>{job.title}</Typography>
                          <Typography color="text.secondary">{job.trade}</Typography>
                          <Typography color="text.secondary">
                            {Math.round(job.distanceMeters)} m away
                          </Typography>
                        </div>
                        <Button component={RouterLink} to={`/contractor/job/view/${job.id}`}>
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

export default ContractorDashboardPage
