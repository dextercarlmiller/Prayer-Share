import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'

function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Password must be at least 12 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.'
  return null
}

export function ResetPassword() {
  const { resetPassword } = useAuthContext()
  const navigate = useNavigate()

  // Detect whether we arrived here via a password-reset link (recovery session)
  const [mode, setMode] = useState<'request' | 'set-password' | 'loading'>('loading')

  // "request" state
  const [email, setEmail] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestDone, setRequestDone] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  // "set-password" state
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [setLoading, setSetLoading] = useState(false)
  const [setError, setSetError] = useState<string | null>(null)

  useEffect(() => {
    // Exchange PKCE code if present, then check for a recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // onAuthStateChange will fire PASSWORD_RECOVERY if this is a reset link
        setMode('set-password')
      } else {
        setMode('request')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setMode('set-password')
      } else if (event === 'SIGNED_OUT') {
        setMode('request')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleRequest(e: FormEvent) {
    e.preventDefault()
    setRequestLoading(true)
    setRequestError(null)
    const { error: err } = await resetPassword(email)
    setRequestLoading(false)
    if (err) setRequestError('Something went wrong. Please try again.')
    else setRequestDone(true)
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault()
    const pwError = validatePassword(password)
    if (pwError) { setSetError(pwError); return }
    if (password !== confirm) { setSetError('Passwords do not match.'); return }
    setSetLoading(true)
    setSetError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSetLoading(false)
    if (err) {
      setSetError('Could not update password. Please try again.')
    } else {
      navigate('/my-list', { replace: true })
    }
  }

  if (mode === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (mode === 'set-password') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Link to="/" className="font-serif text-2xl font-semibold text-stone-800">PrayerShare</Link>
          </div>
          <form onSubmit={handleSetPassword} className="rounded-2xl border border-amber-200 bg-cream p-6 shadow-sm">
            <h1 className="mb-1 font-serif text-xl font-semibold text-stone-800">Set a new password</h1>
            <p className="mb-5 text-sm text-stone-500">At least 12 characters with uppercase, lowercase, a number, and a symbol.</p>

            <div className="mb-4">
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-700">New password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-stone-700">Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            {setError && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{setError}</p>}

            <button
              type="submit"
              disabled={setLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
            >
              {setLoading && <LoadingSpinner size="sm" />}
              Update password
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="font-serif text-2xl font-semibold text-stone-800">PrayerShare</Link>
        </div>

        {requestDone ? (
          <div className="rounded-2xl border border-amber-200 bg-cream p-6 text-center shadow-sm">
            <p className="mb-4 leading-relaxed text-stone-700">
              If there's an account for <strong>{email}</strong>, we've sent a password reset link. Check your inbox.
            </p>
            <Link to="/login" className="text-sm text-amber-700 underline underline-offset-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRequest} className="rounded-2xl border border-amber-200 bg-cream p-6 shadow-sm">
            <h1 className="mb-1 font-serif text-xl font-semibold text-stone-800">Reset your password</h1>
            <p className="mb-5 text-sm text-stone-500">Enter your email and we'll send a reset link.</p>

            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            {requestError && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{requestError}</p>}

            <button
              type="submit"
              disabled={requestLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
            >
              {requestLoading && <LoadingSpinner size="sm" />}
              Send reset link
            </button>

            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-stone-500 hover:text-stone-700">Back to sign in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
