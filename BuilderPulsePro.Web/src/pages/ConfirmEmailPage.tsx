import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Card, CardContent, Container, Link, Stack, Typography } from '@mui/material'
import { confirmEmail } from '../services/authService'

type ConfirmState = 'idle' | 'loading' | 'success' | 'error'

function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<ConfirmState>('idle')
  const [message, setMessage] = useState('')

  const userId = useMemo(() => searchParams.get('userId') ?? '', [searchParams])
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])

  useEffect(() => {
    const confirm = async () => {
      if (!userId || !token) {
        setState('error')
        setMessage('Missing confirmation details.')
        return
      }

      setState('loading')
      setMessage('')

      try {
        await confirmEmail(userId, token)

        setState('success')
        setMessage('Email confirmed. You can log in now.')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unable to confirm email.'
        setState('error')
        setMessage(errorMessage)
      }
    }

    confirm()
  }, [token, userId])

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Card elevation={3}>
        <CardContent>
          <Stack spacing={3}>
            <div>
              <Typography variant="overline" color="primary">
                Email confirmation
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Confirm your email
              </Typography>
            </div>
            {state === 'loading' ? (
              <Typography color="text.secondary">Confirming your email now…</Typography>
            ) : (
              <Typography color={state === 'error' ? 'error' : 'success.main'}>
                {message}
              </Typography>
            )}
            <Typography variant="body2">
              <Link component={RouterLink} to="/login">
                Go to login
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default ConfirmEmailPage
