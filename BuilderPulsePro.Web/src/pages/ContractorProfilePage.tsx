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
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { getAuthToken, setAuthRedirect } from '../services/storageService'
import {
  type AuthorizedUserItem,
  type ContractorProfile,
  type ServiceAreaRequestItem,
  addAuthorizedUser,
  getAuthorizedUsers,
  getContractorProfile,
  removeAuthorizedUser,
  upsertContractorProfile,
} from '../services/contractorService'
import TradeSelectModal from '../components/TradeSelectModal'
import { normalizeTrades } from '../utils/trades'

const RADIUS_OPTIONS = [
  { value: 8047, label: '5 miles' },
  { value: 16093, label: '10 miles' },
  { value: 32187, label: '20 miles' },
  { value: 40234, label: '25 miles' },
  { value: 80467, label: '50 miles' },
  { value: 160934, label: '100 miles' },
  { value: 321869, label: '200 miles' },
]

function ContractorProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [trades, setTrades] = useState<string[]>([])
  const [serviceAreas, setServiceAreas] = useState<ServiceAreaRequestItem[]>([
    { zip: '', radiusMeters: 16093, label: 'Primary' },
  ])
  const [isAvailable, setIsAvailable] = useState(true)
  const [unavailableReason, setUnavailableReason] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false)
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUserItem[] | null>(null)
  const [canManageAuthorizedUsers, setCanManageAuthorizedUsers] = useState(false)
  const [authorizedUserEmail, setAuthorizedUserEmail] = useState('')
  const [authorizedUserError, setAuthorizedUserError] = useState('')
  const [authorizedUserLoading, setAuthorizedUserLoading] = useState(false)

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
        const [profile, authorizedList] = await Promise.all([
          getContractorProfile(token),
          getAuthorizedUsers(token),
        ])
        if (!isActive) return

        if (profile) {
          setDisplayName(profile.displayName)
          setCity(profile.city ?? '')
          setState(profile.state ?? '')
          setZip(profile.zip ?? '')
          setTrades(normalizeTrades(profile.trades))
          setServiceAreas(
            profile.serviceAreas?.length
              ? profile.serviceAreas.map((a) => ({
                  zip: a.zip ?? '',
                  radiusMeters: a.radiusMeters,
                  label: a.label ?? undefined,
                }))
              : [{ zip: profile.zip ?? '', radiusMeters: profile.serviceRadiusMeters, label: 'Primary' }]
          )
          setIsAvailable(profile.isAvailable)
          setUnavailableReason(profile.unavailableReason ?? '')
        }

        if (authorizedList !== null) {
          setCanManageAuthorizedUsers(true)
          setAuthorizedUsers(authorizedList)
        } else {
          setAuthorizedUsers([])
        }
      } catch (err) {
        if (!isActive) return
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
      setErrorMessage('Primary zip code is required.')
      return
    }

    const areasToSave = serviceAreas
      .map((a) => ({ ...a, zip: a.zip.replace(/\D/g, '').slice(0, 5).trim() }))
      .filter((a) => a.zip.length > 0)
    if (areasToSave.length === 0) {
      setErrorMessage('Add at least one service area with a zip code.')
      return
    }
    const invalidRadius = areasToSave.find((a) => a.radiusMeters <= 0)
    if (invalidRadius) {
      setErrorMessage('Each service area must have a radius greater than zero.')
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
        serviceRadiusMeters: areasToSave[0].radiusMeters,
        serviceAreas: areasToSave.map((a) => ({
          zip: a.zip,
          radiusMeters: a.radiusMeters,
          label: a.label?.trim() || null,
        })),
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
    <Container maxWidth="md" sx={{ py: 6 }}>
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
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Service areas
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        setServiceAreas((prev) => [...prev, { zip: '', radiusMeters: 16093, label: '' }])
                      }
                    >
                      Add service area
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Add each area you serve (zip + radius). Job recommendations will include jobs in any of these
                    areas.
                  </Typography>
                  <Stack spacing={2}>
                    {serviceAreas.map((area, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 2,
                          alignItems: 'flex-start',
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <TextField
                          label="Zip code"
                          value={area.zip}
                          onChange={(e) => {
                            const next = [...serviceAreas]
                            next[index] = { ...next[index], zip: e.target.value.replace(/\D/g, '').slice(0, 5) }
                            setServiceAreas(next)
                          }}
                          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 5 }}
                          size="small"
                          sx={{ width: 100 }}
                        />
                        <TextField
                          label="Radius"
                          value={area.radiusMeters}
                          onChange={(e) => {
                            const next = [...serviceAreas]
                            next[index] = { ...next[index], radiusMeters: Number(e.target.value) || 16093 }
                            setServiceAreas(next)
                          }}
                          select
                          size="small"
                          sx={{ minWidth: 120 }}
                        >
                          {RADIUS_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          label="Label (optional)"
                          placeholder="e.g. Denver metro"
                          value={area.label ?? ''}
                          onChange={(e) => {
                            const next = [...serviceAreas]
                            next[index] = { ...next[index], label: e.target.value || undefined }
                            setServiceAreas(next)
                          }}
                          size="small"
                          sx={{ flex: 1, minWidth: 140 }}
                        />
                        <IconButton
                          aria-label="Remove service area"
                          onClick={() =>
                            setServiceAreas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
                          }
                          disabled={serviceAreas.length <= 1}
                          color="error"
                          size="small"
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                </Box>
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
                {canManageAuthorizedUsers && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Authorized users
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      People you add here can place bids and message clients on behalf of this profile. They must
                      already have an account.
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.5 }}>
                      <TextField
                        label="Email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={authorizedUserEmail}
                        onChange={(e) => {
                          setAuthorizedUserEmail(e.target.value)
                          setAuthorizedUserError('')
                        }}
                        size="small"
                        sx={{ minWidth: 260 }}
                        disabled={authorizedUserLoading}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<PersonAddIcon />}
                        onClick={async () => {
                          const email = authorizedUserEmail.trim()
                          if (!email) {
                            setAuthorizedUserError('Enter an email address.')
                            return
                          }
                          const token = getAuthToken()
                          if (!token) return
                          setAuthorizedUserError('')
                          setAuthorizedUserLoading(true)
                          try {
                            const list = await addAuthorizedUser(token, email)
                            setAuthorizedUsers(list)
                            setAuthorizedUserEmail('')
                          } catch (err) {
                            setAuthorizedUserError(err instanceof Error ? err.message : 'Failed to add user.')
                          } finally {
                            setAuthorizedUserLoading(false)
                          }
                        }}
                        disabled={authorizedUserLoading}
                      >
                        Add
                      </Button>
                    </Stack>
                    {authorizedUserError && (
                      <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                        {authorizedUserError}
                      </Typography>
                    )}
                    {authorizedUsers && authorizedUsers.length > 0 ? (
                      <Stack spacing={1}>
                        {authorizedUsers.map((au) => (
                          <Box
                            key={au.userId}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              py: 1,
                              px: 1.5,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                            }}
                          >
                            <Typography variant="body2">{au.email}</Typography>
                            <IconButton
                              aria-label={`Remove ${au.email}`}
                              size="small"
                              color="error"
                              disabled={authorizedUserLoading}
                              onClick={async () => {
                                const token = getAuthToken()
                                if (!token) return
                                setAuthorizedUserError('')
                                setAuthorizedUserLoading(true)
                                try {
                                  await removeAuthorizedUser(token, au.userId)
                                  setAuthorizedUsers((prev) => prev!.filter((x) => x.userId !== au.userId))
                                } catch (err) {
                                  setAuthorizedUserError(err instanceof Error ? err.message : 'Failed to remove.')
                                } finally {
                                  setAuthorizedUserLoading(false)
                                }
                              }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      authorizedUsers && (
                        <Typography variant="body2" color="text.secondary">
                          No authorized users yet. Add someone by email above.
                        </Typography>
                      )
                    )}
                  </Box>
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
