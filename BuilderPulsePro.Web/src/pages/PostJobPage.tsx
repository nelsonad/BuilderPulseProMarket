import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardContent, Container, Link, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { getAuthToken, setAuthRedirect } from '../services/storageService'
import { createJob, uploadJobAttachments } from '../services/jobsService'
import { tradeOptions } from '../utils/trades'

function PostJobPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [title, setTitle] = useState('')
  const [trade, setTrade] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setAuthRedirect(location.pathname)
      navigate('/login')
    }
  }, [location.pathname, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const token = getAuthToken()
    if (!token) {
      setAuthRedirect('/jobs/post')
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
      const job = await createJob(token, {
        title: title.trim(),
        trade: trade.trim(),
        description: description.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip: zip.trim() || null,
        lat: 0,
        lng: 0,
      })

      if (attachments.length > 0) {
        await uploadJobAttachments(token, job.id, attachments)
      }

      setSuccessMessage('Job submitted.')
      setTitle('')
      setTrade('')
      setDescription('')
      setCity('')
      setState('')
      setZip('')
      setAttachments([])
      navigate('/client-dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to post job.'
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
                Post a job
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Share your next project
              </Typography>
              <Typography color="text.secondary">
                Add project details, location, and trade requirements to connect with qualified contractors.
              </Typography>
            </Box>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Title"
                  value={title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Trade"
                  value={trade}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setTrade(event.target.value)}
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
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
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
                <Button variant="outlined" component="label">
                  Add attachments
                  <input
                    hidden
                    type="file"
                    multiple
                    onChange={(event) =>
                      setAttachments(Array.from(event.target.files ?? []))
                    }
                  />
                </Button>
                {attachments.length > 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    {attachments.length} attachment{attachments.length > 1 ? 's' : ''} selected
                  </Typography>
                ) : null}
                <Button variant="contained" size="large" type="submit">
                  Save job
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
            <Link component={RouterLink} to="/client-dashboard">
              Back to dashboard
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default PostJobPage
