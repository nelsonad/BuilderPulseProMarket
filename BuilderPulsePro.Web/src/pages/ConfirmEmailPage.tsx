import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import '../App.css'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

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
        const response = await fetch(
          `${apiBaseUrl}/auth/confirm-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`,
        )

        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || `Request failed (${response.status})`)
        }

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

  const messageClass = state === 'error' ? 'error' : state === 'success' ? 'success' : 'page-body'

  return (
    <div className="page-shell">
      <div className="page-card">
        <p className="page-kicker">Email confirmation</p>
        <h1 className="page-title">Confirm your email</h1>
        {state === 'loading' && <p className="page-body">Confirming your email now…</p>}
        {state !== 'loading' && <p className={messageClass}>{message}</p>}
        <div className="page-links">
          <Link to="/login">Go to login</Link>
        </div>
      </div>
    </div>
  )
}

export default ConfirmEmailPage
