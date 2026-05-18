import { FormEvent, useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useAuthContext } from '../context/AuthContext'

export function Account() {
  const { profile, user, profileError, updateProfile, signOut } = useAuthContext()
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  useEffect(() => { setFirstName(profile?.first_name ?? '') }, [profile])
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSavedMsg(null)
    setSaveError(null)
    try {
      const { error } = await updateProfile({ first_name: firstName.trim() })
      if (error) setSaveError(
        (error as { message?: string }).message
          ? `Could not save changes: ${(error as { message?: string }).message}`
          : 'Could not save changes.'
      )
      else setSavedMsg('Changes saved.')
    } catch {
      setSaveError('Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">Account</h1>
      </div>

      {profileError && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</p>
      )}

      <section className="mb-8 max-w-md">
        <h2 className="mb-4 font-serif text-lg font-medium text-stone-700">Your details</h2>
        <form onSubmit={handleSave} className="rounded-2xl border border-amber-200 bg-cream p-5 shadow-sm">
          <div className="mb-4">
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

      <section className="max-w-md">
        <h2 className="mb-4 font-serif text-lg font-medium text-stone-700">Sign out</h2>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
        >
          {signingOut && <LoadingSpinner size="sm" />}
          Sign out
        </button>
      </section>
    </Layout>
  )
}
