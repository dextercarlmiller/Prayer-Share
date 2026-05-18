import { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function Login() {
  const { session, signIn } = useAuthContext()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/my-list'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError('The email or password didn\'t match. Please try again.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="font-serif text-2xl font-semibold text-stone-800">PrayerShare</Link>
          <p className="mt-2 text-stone-500">Welcome back.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-200 bg-cream p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4">
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
                autoComplete="current-password"
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
            Sign in
          </button>

          <div className="mt-4 text-center">
            <Link to="/reset-password" className="text-sm text-stone-500 underline underline-offset-2 hover:text-stone-700">
              Forgot your password?
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-amber-700 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
