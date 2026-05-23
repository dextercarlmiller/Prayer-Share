import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useAuthContext } from '../context/AuthContext'

type Status = 'loading' | 'joined' | 'already_member' | 'invalid' | 'needs_login' | 'error'

export function InviteAccept() {
  const { token } = useParams<{ token: string }>()
  const { session } = useAuthContext()
  const [status, setStatus] = useState<Status>('loading')
  const [groupName, setGroupName] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    if (!session) { setStatus('needs_login'); return }
    acceptInvite(token)
  }, [token, session])

  async function acceptInvite(inviteToken: string) {
    const { data, error } = await supabase.rpc('accept_invite_by_token', { p_token: inviteToken })

    if (error) { setStatus('error'); return }

    const result = data as { status?: string; error?: string; group_name?: string } | null

    if (!result) { setStatus('error'); return }
    if (result.error === 'not_authenticated') { setStatus('needs_login'); return }
    if (result.error === 'invalid_or_expired') { setStatus('invalid'); return }

    setGroupName(result.group_name ?? null)

    if (result.status === 'already_member') { setStatus('already_member'); return }
    if (result.status === 'joined') { setStatus('joined'); return }

    setStatus('error')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4 py-12">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <div className="flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {status === 'needs_login' && (
          <>
            <div className="mb-4 text-4xl text-amber-400">✦</div>
            <h1 className="mb-3 font-serif text-2xl font-semibold text-stone-800">You've been invited</h1>
            <p className="mb-6 leading-relaxed text-stone-600">
              Sign in or create an account to accept this invitation.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to={`/login?next=/invite/${token}`}
                className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700"
              >
                Sign in
              </Link>
              <Link
                to={`/signup?next=/invite/${token}`}
                className="rounded-xl border border-amber-300 px-6 py-3 font-medium text-stone-700 transition-colors hover:bg-amber-50"
              >
                Create account
              </Link>
            </div>
          </>
        )}

        {status === 'joined' && (
          <>
            <div className="mb-4 text-4xl text-green-500">✓</div>
            <h1 className="mb-3 font-serif text-2xl font-semibold text-stone-800">You've joined!</h1>
            <p className="mb-6 text-stone-600">Welcome to {groupName ?? 'the group'}.</p>
            <Link to="/groups" className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700">
              See the group
            </Link>
          </>
        )}

        {status === 'already_member' && (
          <>
            <div className="mb-4 text-4xl text-amber-400">✦</div>
            <h1 className="mb-3 font-serif text-2xl font-semibold text-stone-800">You're already in</h1>
            <p className="mb-6 text-stone-600">You're already a member of {groupName ?? 'this group'}.</p>
            <Link to="/groups" className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700">
              Go to groups
            </Link>
          </>
        )}

        {(status === 'invalid' || status === 'error') && (
          <>
            <div className="mb-4 text-4xl text-stone-300">✕</div>
            <h1 className="mb-3 font-serif text-2xl font-semibold text-stone-800">
              {status === 'invalid' ? 'This link has expired' : 'Something went wrong'}
            </h1>
            <p className="mb-6 text-stone-600">
              {status === 'invalid'
                ? 'The invitation link is no longer valid. Ask the group admin to send a new one.'
                : 'We couldn\'t process the invitation. Please try again or contact the person who invited you.'}
            </p>
            <Link to="/" className="text-sm text-amber-700 underline underline-offset-2">
              Go home
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
