import { FormEvent, useState } from 'react'
import { Modal } from './Modal'
import { LoadingSpinner } from './LoadingSpinner'

interface AddPrayerFormProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (title: string, details: string | null) => Promise<{ error: Error | null }>
}

export function AddPrayerForm({ isOpen, onClose, onAdd }: AddPrayerFormProps) {
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    const { error: err } = await onAdd(title.trim(), details.trim() || null)
    setLoading(false)
    if (err) {
      setError('Something went wrong. Please try again.')
    } else {
      setTitle('')
      setDetails('')
      onClose()
    }
  }

  function handleClose() {
    setTitle('')
    setDetails('')
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add a prayer">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="prayer-title" className="mb-1.5 block text-sm font-medium text-stone-700">
            What are you bringing to prayer?
          </label>
          <input
            id="prayer-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="A name, a situation, a question…"
            maxLength={140}
            required
            autoFocus
            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>
        <div>
          <label htmlFor="prayer-details" className="mb-1.5 block text-sm font-medium text-stone-700">
            Details <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea
            id="prayer-details"
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="A little more context, if you'd like…"
            rows={4}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <LoadingSpinner size="sm" />}
          Add prayer
        </button>
      </form>
    </Modal>
  )
}
