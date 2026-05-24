import { FormEvent, useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { LoadingSpinner, PageLoader } from '../components/LoadingSpinner'
import { PrayerCard } from '../components/PrayerCard'
import { EmptyState } from '../components/EmptyState'
import { useAuthContext } from '../context/AuthContext'
import { usePrayerRequests } from '../hooks/usePrayerRequests'

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getInitials(firstName: string, lastName: string): string {
  return [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || '?'
}

export function Account() {
  const { profile, user, profileError, updateProfile, signOut, deleteAccount, resetPassword } = useAuthContext()

  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  useEffect(() => {
    setFirstName(profile?.first_name ?? '')
    setLastName(profile?.last_name ?? '')
  }, [profile])

  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [sendingReset, setSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  const [signingOut, setSigningOut] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { requests: answeredPrayers, loading: answeredLoading, prayFor, markAnswered, updateStatus, archiveRequest } = usePrayerRequests({ answered: true })

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSavedMsg(null)
    setSaveError(null)
    try {
      const { error } = await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() })
      if (error) setSaveError((error as { message?: string }).message ?? 'Could not save changes.')
      else setSavedMsg('Changes saved.')
    } catch {
      setSaveError('Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordReset() {
    if (!user?.email) return
    setSendingReset(true)
    setResetError(null)
    const { error } = await resetPassword(user.email)
    setSendingReset(false)
    if (error) setResetError('Could not send reset email. Please try again.')
    else setResetSent(true)
  }

  async function handleRequestNotifications() {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await deleteAccount()
    if (error) {
      setDeleteError('Could not delete account. Please try again.')
      setDeleting(false)
    }
  }

  const initials = getInitials(profile?.first_name ?? '', profile?.last_name ?? '')
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your account'

  return (
    <Layout>
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xl font-semibold text-white select-none">
          {initials}
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-800">{displayName}</h1>
          {profile?.created_at && (
            <p className="mt-0.5 text-sm text-stone-400">Member since {formatMemberSince(profile.created_at)}</p>
          )}
        </div>
      </div>

      {profileError && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</p>
      )}

      {/* Your details */}
      <section className="mb-8 max-w-md">
        <h2 className="mb-4 font-serif text-lg font-medium text-stone-700">Your details</h2>
        <form onSubmit={handleSave} className="rounded-2xl border border-amber-200 bg-cream p-5 shadow-sm">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first-name" className="mb-1.5 block text-sm font-medium text-stone-700">
                First name
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label htmlFor="last-name" className="mb-1.5 block text-sm font-medium text-stone-700">
                Last name
              </label>
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Email</label>
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-stone-600">
              {user?.email}
            </p>
          </div>
          {saveError && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{saveError}</p>}
          {savedMsg && <p className="mb-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{savedMsg}</p>}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
          >
            {saving && <LoadingSpinner size="sm" />}
            Save changes
          </button>
        </form>
      </section>

      {/* Security */}
      <section className="mb-8 max-w-md">
        <h2 className="mb-4 font-serif text-lg font-medium text-stone-700">Security</h2>
        <div className="rounded-2xl border border-amber-200 bg-cream p-5 shadow-sm">
          <p className="mb-3 text-sm text-stone-500">
            A password reset link will be sent to <span className="font-medium text-stone-700">{user?.email}</span>.
          </p>
          {resetError && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{resetError}</p>}
          {resetSent && (
            <p className="mb-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
              Reset email sent — check your inbox.
            </p>
          )}
          <button
            onClick={handlePasswordReset}
            disabled={sendingReset || resetSent}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            {sendingReset && <LoadingSpinner size="sm" />}
            {resetSent ? 'Email sent' : 'Send password reset email'}
          </button>
        </div>
      </section>

      {/* Notifications */}
      {typeof Notification !== 'undefined' && (
        <section className="mb-8 max-w-md">
          <h2 className="mb-4 font-serif text-lg font-medium text-stone-700">Notifications</h2>
          <div className="rounded-2xl border border-amber-200 bg-cream p-5 shadow-sm">
            {notifPermission === 'granted' && (
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
                <p className="text-sm text-stone-600">Browser notifications are enabled.</p>
              </div>
            )}
            {notifPermission === 'denied' && (
              <p className="text-sm text-stone-500">
                Notifications are blocked. To enable them, update this site's permissions in your browser settings.
              </p>
            )}
            {notifPermission === 'default' && (
              <>
                <p className="mb-3 text-sm text-stone-500">
                  Enable browser notifications to receive prayer reminders.
                </p>
                <button
                  onClick={handleRequestNotifications}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  Enable notifications
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* Answered prayers */}
      <section className="mb-8">
        <h2 className="mb-1 font-serif text-lg font-medium text-stone-700">Answered prayers</h2>
        <p className="mb-4 text-sm text-stone-500">A record of prayers that were answered.</p>
        {answeredLoading && <PageLoader />}
        {!answeredLoading && answeredPrayers.length === 0 && (
          <EmptyState
            title="No answered prayers yet."
            description="When you mark a prayer as answered, it will appear here — a quiet record of faithfulness."
          />
        )}
        {!answeredLoading && answeredPrayers.length > 0 && (
          <ul className="flex flex-col gap-3" role="list">
            {answeredPrayers.map(r => (
              <li key={r.id}>
                <PrayerCard
                  request={r}
                  currentUserId={user?.id}
                  onPrayFor={prayFor}
                  onMarkAnswered={markAnswered}
                  onArchive={archiveRequest}
                  onUpdateStatus={updateStatus}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Session */}
      <section className="mb-8 max-w-md">
        <h2 className="mb-4 font-serif text-lg font-medium text-stone-700">Session</h2>
        <div className="rounded-2xl border border-amber-200 bg-cream p-5 shadow-sm">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            {signingOut && <LoadingSpinner size="sm" />}
            Sign out
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="mb-8 max-w-md">
        <h2 className="mb-4 font-serif text-lg font-medium text-red-700">Danger zone</h2>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          {deleteError && (
            <p className="mb-3 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700">{deleteError}</p>
          )}
          {!deleteConfirm ? (
            <>
              <p className="mb-3 text-sm text-stone-600">
                Permanently delete your account and all prayer data. This cannot be undone.
              </p>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
              >
                Delete my account
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm font-medium text-stone-800">
                Are you sure? All your prayers and account data will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting && <LoadingSpinner size="sm" />}
                  Yes, delete everything
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </Layout>
  )
}
