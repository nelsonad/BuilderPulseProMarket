import { type ChangeEvent, type FormEvent, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
import { register } from '../services/authService'

function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
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

    if (!confirmPassword) {
      setConfirmError('Confirm your password.')
      isValid = false
    } else if (confirmPassword !== password) {
      setConfirmError('Passwords do not match.')
      isValid = false
    } else {
      setConfirmError('')
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
      await register(email.trim(), password)

      setSubmitSuccess('Account created. Check your email to confirm your account.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register.'
      setSubmitError(message)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Card elevation={3}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="primary">
                Get started
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Create your BuilderPulse Pro account
              </Typography>
              <Typography color="text.secondary">
                Join to post projects or bid on the right jobs.
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
                  autoComplete="new-password"
                  error={Boolean(passwordError)}
                  helperText={passwordError}
                  fullWidth
                />
                <TextField
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  error={Boolean(confirmError)}
                  helperText={confirmError}
                  fullWidth
                />
                <Button variant="contained" size="large" type="submit">
                  Create account
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
              <Link component={RouterLink} to="/login">
                Already have an account? Log in
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default SignUpPage
