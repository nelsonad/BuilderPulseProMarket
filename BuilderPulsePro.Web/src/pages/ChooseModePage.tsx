import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Card, CardContent, Container, Stack, Typography } from '@mui/material'
import { setUserMode, getAuthToken, setAuthRedirect } from '../services/storageService'

type UserMode = 'client' | 'contractor'

function ChooseModePage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [selectedMode, setSelectedMode] = useState<UserMode | null>(null)

    useEffect(() => {
        const token = getAuthToken()
        if (!token) {
            setAuthRedirect(location.pathname)
            navigate('/login')
        }
    }, [location.pathname, navigate])

  const chooseMode = (mode: UserMode) => {
    setUserMode(mode)
    setSelectedMode(mode)
    navigate(mode === 'client' ? '/client-dashboard' : '/contractor-dashboard')
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Card elevation={3}>
        <CardContent>
          <Stack spacing={3}>
            <div>
              <Typography variant="overline" color="primary">
                Choose a mode
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                How will you use BuilderPulse Pro?
              </Typography>
              <Typography color="text.secondary">
                Select a role to tailor your experience. You can change this later.
              </Typography>
            </div>
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <Button variant="contained" onClick={() => chooseMode('client')} fullWidth>
                Client
              </Button>
              <Button variant="outlined" onClick={() => chooseMode('contractor')} fullWidth>
                Contractor
              </Button>
            </Stack>
            {selectedMode ? (
              <Typography color="success.main">
                Saved: {selectedMode === 'client' ? 'Client' : 'Contractor'}.
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default ChooseModePage
