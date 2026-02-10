import { Link as RouterLink } from 'react-router-dom'
import { Card, CardContent, Container, Link, Stack, Typography } from '@mui/material'

function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card elevation={3}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="overline" color="primary">
              404
            </Typography>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Page not found
            </Typography>
            <Typography color="text.secondary">
              The page you requested doesn't exist yet.
            </Typography>
            <Stack spacing={1}>
              <Link component={RouterLink} to="/">
                Go to landing
              </Link>
              <Link component={RouterLink} to="/client-dashboard">
                Go to dashboard
              </Link>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  )
}

export default NotFoundPage
