import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useGroups } from '../hooks/useGroups'

export function NewGroup() {
  const { createGroup } = useGroups()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    const { error: err, group } = await createGroup(name.trim())
    setLoading(false)
    if (err) {
      setError('Could not create the group. Please try again.')
    } else if (group) {
      navigate(`/groups/${group.id}`)
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">New group</h1>
        <p className="mt-1 text-stone-500">Give your group a name, then invite people by email.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md rounded-2xl border border-amber-200 bg-cream p-6 shadow-sm">
        <div className="mb-5">
          <label htmlFor="group-name" className="mb-1.5 block text-sm font-medium text-stone-700">
            Group name
          </label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="XA Small Group, Miller Family…"
            maxLength={80}
            required
            autoFocus
            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
        >
          {loading && <LoadingSpinner size="sm" />}
          Create group
        </button>
      </form>
    </Layout>
  )
}
