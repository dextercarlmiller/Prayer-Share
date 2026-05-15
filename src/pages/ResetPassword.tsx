import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function ResetPassword() {
  const { resetPassword } = useAuthContext()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) setError('Something went wrong. Please try again.')
    else setDone(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="font-serif text-2xl font-semibold text-stone-800">PrayerShare</Link>
        </div>

        {done ? (
          <div className="rounded-2xl border border-amber-200 bg-cream p-6 text-center shadow-sm">
            <p className="mb-4 leading-relaxed text-stone-700">
              If there's an account for <strong>{email}</strong>, we've sent a password reset link. Check your inbox.
            </p>
            <Link to="/login" className="text-sm text-amber-700 underline underline-offset-2">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-200 bg-cream p-6 shadow-sm">
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

            {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
            >
              {loading && <LoadingSpinner size="sm" />}
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
