import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { getAuthToken, setAuthRedirect } from '../services/storageService'
import {
  type ContractorProfile,
  getContractorProfile,
  upsertContractorProfile,
} from '../services/contractorService'
import TradeSelectModal from '../components/TradeSelectModal'
import { normalizeTrades } from '../utils/trades'

function ContractorProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [trades, setTrades] = useState<string[]>([])
  const [radius, setRadius] = useState('16093')
  const [isAvailable, setIsAvailable] = useState(true)
  const [unavailableReason, setUnavailableReason] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setAuthRedirect(location.pathname)
      navigate('/login')
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      return
    }

    let isActive = true

    const loadProfile = async () => {
      try {
        const profile = await getContractorProfile(token)
        if (!profile || !isActive) {
          return
        }

        setDisplayName(profile.displayName)
        setCity(profile.city ?? '')
        setState(profile.state ?? '')
        setZip(profile.zip ?? '')
        setTrades(normalizeTrades(profile.trades))
        setRadius(profile.serviceRadiusMeters.toString())
        setIsAvailable(profile.isAvailable)
        setUnavailableReason(profile.unavailableReason ?? '')
      } catch (err) {
        if (!isActive) {
          return
        }
        const message = err instanceof Error ? err.message : 'Unable to load profile.'
        setErrorMessage(message)
      }
    }

    loadProfile()

    return () => {
      isActive = false
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const token = getAuthToken()
    if (!token) {
      setAuthRedirect('/contractor/profile')
      navigate('/login')
      return
    }

    const radiusValue = Number(radius)
    const normalizedTrades = normalizeTrades(trades)

    if (!displayName.trim()) {
      setErrorMessage('Display name is required.')
      return
    }

    if (normalizedTrades.length === 0) {
      setErrorMessage('Add at least one trade.')
      return
    }

    if (!zip.trim()) {
      setErrorMessage('Zip code is required.')
      return
    }

    if (Number.isNaN(radiusValue) || radiusValue <= 0) {
      setErrorMessage('Service radius must be greater than zero.')
      return
    }

    try {
      const payload = {
        displayName: displayName.trim(),
        trades: normalizedTrades,
        city: city.trim() || null,
        state: state.trim() || null,
        zip: zip || null,
        lat: 0,
        lng: 0,
        serviceRadiusMeters: radiusValue,
        isAvailable,
        unavailableReason: isAvailable ? null : unavailableReason.trim() || null,
      }

      const response: ContractorProfile = await upsertContractorProfile(token, payload)
      setSuccessMessage(`Saved profile for ${response.displayName}.`)
      navigate('/contractor-dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save profile.'
      setErrorMessage(message)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card elevation={3}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="primary">
                Contractor profile
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Tell us about your services
              </Typography>
              <Typography color="text.secondary">
                Add your trades and location to get job recommendations tailored to you.
              </Typography>
            </Box>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Display name"
                  value={displayName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setDisplayName(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="City"
                  value={city}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setCity(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="State"
                  value={state}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setState(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Zip code"
                  value={zip}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setZip(event.target.value.replace(/\D/g, '').slice(0, 5))
                  }
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 5 }}
                  fullWidth
                />
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Trades
                    </Typography>
                    <Button variant="outlined" size="small" onClick={() => setIsTradeModalOpen(true)}>
                      Select trades
                    </Button>
                  </Stack>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      padding: 1.5,
                      minHeight: 56,
                    }}
                  >
                    {trades.length > 0 ? (
                      trades.map((trade) => <Chip key={trade} label={trade} />)
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No trades selected
                      </Typography>
                    )}
                  </Box>
                </Box>
                <TextField
                  label="Service radius"
                  value={radius}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setRadius(event.target.value)}
                  select
                  fullWidth
                >
                  <MenuItem value="8047">5 miles</MenuItem>
                  <MenuItem value="16093">10 miles</MenuItem>
                  <MenuItem value="32187">20 miles</MenuItem>
                  <MenuItem value="40234">25 miles</MenuItem>
                  <MenuItem value="80467">50 miles</MenuItem>
                  <MenuItem value="160934">100 miles</MenuItem>
                  <MenuItem value="321869">200 miles</MenuItem>
                </TextField>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isAvailable}
                      onChange={(event) => setIsAvailable(event.target.checked)}
                      color="primary"
                    />
                  }
                  label={isAvailable ? 'Available for new jobs' : 'Unavailable for new jobs'}
                />
                {!isAvailable && (
                  <TextField
                    label="Unavailable reason"
                    value={unavailableReason}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setUnavailableReason(event.target.value)}
                    fullWidth
                  />
                )}
                <Button variant="contained" size="large" type="submit">
                  Save profile
                </Button>
                {errorMessage && (
                  <Typography color="error" variant="body2">
                    {errorMessage}
                  </Typography>
                )}
                {successMessage && (
                  <Typography color="success.main" variant="body2">
                    {successMessage}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <TradeSelectModal
        open={isTradeModalOpen}
        selectedTrades={trades}
        onClose={() => setIsTradeModalOpen(false)}
        onChange={setTrades}
      />
    </Container>
  )
}

export default ContractorProfilePage
