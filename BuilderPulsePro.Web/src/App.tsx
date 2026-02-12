import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import AppHeader from './components/AppHeader'
import ChooseModePage from './pages/ChooseModePage'
import ClientDashboardPage from './pages/ClientDashboardPage'
import ContractorDashboardPage from './pages/ContractorDashboardPage'
import ContractorJobDetailsPage from './pages/ContractorJobDetailsPage'
import ContractorProfilePage from './pages/ContractorProfilePage'
import ConfirmEmailPage from './pages/ConfirmEmailPage'
import JobDetailsPage from './pages/JobDetailsPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import PostJobPage from './pages/PostJobPage'
import SignUpPage from './pages/SignUpPage'

function App() {
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#2563eb' },
      secondary: { main: '#64748b' },
    },
    shape: { borderRadius: 12 },
  })

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <div className="app-shell">
          <AppHeader />
          <main className="app-content">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/confirm-email" element={<ConfirmEmailPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/choose-mode" element={<ChooseModePage />} />
              <Route path="/client-dashboard" element={<ClientDashboardPage />} />
              <Route path="/contractor-dashboard" element={<ContractorDashboardPage />} />
              <Route path="/contractor/profile" element={<ContractorProfilePage />} />
              <Route path="/contractor/job/view/:jobId" element={<ContractorJobDetailsPage />} />
              <Route path="/jobs/post" element={<PostJobPage />} />
              <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
