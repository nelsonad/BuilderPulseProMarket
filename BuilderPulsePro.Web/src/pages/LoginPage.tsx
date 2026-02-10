import { type ChangeEvent, type FormEvent, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { login } from '../services/authService'
import {
  clearAuthRedirect,
  getAuthRedirect,
  getUserMode,
  setAuthToken,
} from '../services/storageService'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const validate = () => {
    const nextEmail = email.trim()
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    let isValid = true

    if (!nextEmail) {
      setEmailError('Email is required.')
      isValid = false
    } else if (!emailPattern.test(nextEmail)) {
      setEmailError('Enter a valid email address.')
      isValid = false
    } else {
      setEmailError('')
    }

    if (!password) {
      setPasswordError('Password is required.')
      isValid = false
    } else {
      setPasswordError('')
    }

    return isValid
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!validate()) {
      return
    }

    try {
      const payload = await login(email.trim(), password)
      setAuthToken(payload.accessToken)

      const redirectTarget = getAuthRedirect()
      const storedMode = getUserMode()

      setSubmitSuccess('Logged in successfully.')
      if (redirectTarget) {
        clearAuthRedirect()
        navigate(redirectTarget)
      } else if (storedMode === 'client') {
        navigate('/client-dashboard')
      } else if (storedMode === 'contractor') {
        navigate('/contractor-dashboard')
      } else {
        navigate('/choose-mode')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to log in.'
      setSubmitError(message)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card elevation={3}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="primary">
                Welcome back
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Log in to BuilderPulsePro
              </Typography>
              <Typography color="text.secondary">
                Use your account to track jobs and coordinate with contractors.
              </Typography>
            </Box>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Email address"
                  value={email}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  error={Boolean(emailError)}
                  helperText={emailError}
                  fullWidth
                />
                <TextField
                  label="Password"
                  value={password}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                  error={Boolean(passwordError)}
                  helperText={passwordError}
                  fullWidth
                />
                <Button variant="contained" size="large" type="submit">
                  Log in
                </Button>
                {submitError && (
                  <Typography color="error" variant="body2">
                    {submitError}
                  </Typography>
                )}
                {submitSuccess && (
                  <Typography color="success.main" variant="body2">
                    {submitSuccess}
                  </Typography>
                )}
              </Stack>
            </Box>
            <Typography variant="body2">
              <Link component={RouterLink} to="/signup">
                Need an account? Sign up
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default LoginPage
