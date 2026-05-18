import { useState } from 'react'
import { Layout } from '../components/Layout'
import { PrayerCard } from '../components/PrayerCard'
import { AddPrayerForm } from '../components/AddPrayerForm'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import { usePrayerRequests } from '../hooks/usePrayerRequests'
import { useAuthContext } from '../context/AuthContext'

export function MyList() {
  const { profileError } = useAuthContext()
  const { requests, loading, error, addRequest, markAnswered, archiveRequest, prayFor } = usePrayerRequests()
  const [formOpen, setFormOpen] = useState(false)

  return (
    <Layout>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">My prayers</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
          aria-label="Add a prayer request"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add prayer
        </button>
      </div>

      {(loading) && <PageLoader />}

      {!loading && (profileError || error) && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{profileError ?? error}</p>
      )}

      {!loading && !error && requests.length === 0 && (
        <EmptyState
          title="No prayers here yet."
          description="Add your first one — even just a name."
          action={
            <button
              onClick={() => setFormOpen(true)}
              className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700"
            >
              Add a prayer
            </button>
          }
        />
      )}

      {!loading && !error && requests.length > 0 && (
        <ul className="flex flex-col gap-3" role="list" aria-label="Prayer requests">
          {requests.map(r => (
            <li key={r.id}>
              <PrayerCard
                request={r}
                onPrayFor={prayFor}
                onMarkAnswered={markAnswered}
                onArchive={archiveRequest}
              />
            </li>
          ))}
        </ul>
      )}

      <AddPrayerForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onAdd={(title, details) => addRequest(title, details)}
      />
    </Layout>
  )
}
