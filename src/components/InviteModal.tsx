import { FormEvent, useState } from 'react'
import { Modal } from './Modal'
import { LoadingSpinner } from './LoadingSpinner'
import { GroupInvite } from '../types'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string) => Promise<{ error: Error | null }>
  pendingInvites: GroupInvite[]
}

export function InviteModal({ isOpen, onClose, onInvite, pendingInvites }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    const { error: err } = await onInvite(email.trim())
    setLoading(false)
    if (err) {
      setError('Could not send the invitation. They may already be a member.')
    } else {
      setSuccessMsg(`Invitation sent to ${email.trim()}.`)
      setEmail('')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite someone">
      <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-4">
        <div>
          <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium text-stone-700">
            Their email address
          </label>
          <div className="flex gap-2">
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="friend@example.com"
              required
              autoFocus
              className="flex-1 rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Send'}
            </button>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
        {successMsg && <p className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">{successMsg}</p>}
      </form>

      {pendingInvites.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-stone-500">Pending invitations</h3>
          <ul className="flex flex-col gap-2">
            {pendingInvites.map(invite => (
              <li key={invite.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2.5 text-sm">
                <span className="text-stone-700">{invite.invited_email}</span>
                <span className="text-stone-400">Pending</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
