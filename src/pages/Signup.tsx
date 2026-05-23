import { FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
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

export function Signup() {
  const { session, signUp } = useAuthContext()

  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) return <Navigate to="/my-list" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const pwError = validatePassword(password)
    if (pwError) {
      setError(pwError)
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await signUp(email, password, firstName.trim())
    setLoading(false)
    if (err) {
      setError(err.message.includes('already registered')
        ? 'That email is already registered. Try signing in.'
        : 'Something went wrong. Please try again.')
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-4xl text-amber-400">✦</div>
          <h1 className="mb-3 font-serif text-2xl font-semibold text-stone-800">Check your email</h1>
          <p className="mb-6 leading-relaxed text-stone-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account and you'll be ready to go.
          </p>
          <Link to="/login" className="text-sm text-amber-700 underline underline-offset-2 hover:text-amber-800">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="font-serif text-2xl font-semibold text-stone-800">PrayerShare</Link>
          <p className="mt-2 text-stone-500">A quiet place for prayer.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-200 bg-cream p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4">
            <div>
              <label htmlFor="first-name" className="mb-1.5 block text-sm font-medium text-stone-700">
                First name
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                placeholder="What should we call you?"
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
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
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-700">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
                placeholder="At least 12 characters, mixed case, number &amp; symbol"
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>

          {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
          >
            {loading && <LoadingSpinner size="sm" />}
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-amber-700 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
