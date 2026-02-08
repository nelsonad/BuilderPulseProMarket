import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

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
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed (${response.status})`)
      }

      setSubmitSuccess('Logged in successfully.')
      navigate('/choose-mode')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to log in.'
      setSubmitError(message)
    }
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <p className="page-kicker">Welcome back</p>
        <h1 className="page-title">Log in to BuilderPulse Pro</h1>
        <p className="page-body">Use your account to track jobs and coordinate with contractors.</p>
        <form className="form" onSubmit={handleSubmit} noValidate>
          <label>
            Email address
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
            />
          </label>
          {emailError && <span className="error">{emailError}</span>}
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          {passwordError && <span className="error">{passwordError}</span>}
          <button className="button primary" type="submit">
            Log in
          </button>
          {submitError && <span className="error">{submitError}</span>}
          {submitSuccess && <span className="success">{submitSuccess}</span>}
        </form>
        <div className="page-links">
          <Link to="/signup">Need an account? Sign up</Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
