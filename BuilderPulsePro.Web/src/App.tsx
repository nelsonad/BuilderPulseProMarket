import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ChooseModePage from './pages/ChooseModePage'
import ConfirmEmailPage from './pages/ConfirmEmailPage'
import JobDetailsPage from './pages/JobDetailsPage'
import JobsPage from './pages/JobsPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import PostJobPage from './pages/PostJobPage'
import SignUpPage from './pages/SignUpPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/choose-mode" element={<ChooseModePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/post" element={<PostJobPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
