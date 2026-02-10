import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Container, Link, Stack, Typography } from '@mui/material'

function LandingPage() {
  return (
    <Container maxWidth="md" sx={{ py: 10 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="overline" color="primary">
          BuilderPulsePro
        </Typography>
        <Typography variant="h2" fontWeight={700} gutterBottom>
          Build your next project connection
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Discover opportunities or post jobs for trusted contractors in minutes.
        </Typography>
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">
          <Button component={RouterLink} to="/choose-mode" variant="contained" size="large">
            Find a Job
          </Button>
          <Button component={RouterLink} to="/jobs/post" variant="outlined" size="large">
            Post a Job
          </Button>
        </Stack>
        <Stack spacing={2} direction="row" justifyContent="center" sx={{ mt: 3 }}>
          <Link component={RouterLink} to="/login">
            Login
          </Link>
          <Link component={RouterLink} to="/signup">
            Sign Up
          </Link>
        </Stack>
      </Box>
    </Container>
  )
}

export default LandingPage
