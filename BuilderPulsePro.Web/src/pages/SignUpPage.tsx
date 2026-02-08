import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

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
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed (${response.status})`)
      }

      setSubmitSuccess('Account created. Check your email to confirm your account.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register.'
      setSubmitError(message)
    }
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <p className="page-kicker">Get started</p>
        <h1 className="page-title">Create your BuilderPulse Pro account</h1>
        <p className="page-body">Join to post projects or bid on the right jobs.</p>
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
              autoComplete="new-password"
            />
          </label>
          {passwordError && <span className="error">{passwordError}</span>}
          <label>
            Confirm password
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </label>
          {confirmError && <span className="error">{confirmError}</span>}
          <button className="button primary" type="submit">
            Create account
          </button>
          {submitError && <span className="error">{submitError}</span>}
          {submitSuccess && <span className="success">{submitSuccess}</span>}
        </form>
        <div className="page-links">
          <Link to="/login">Already have an account? Log in</Link>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage
