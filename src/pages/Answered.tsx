import { Layout } from '../components/Layout'
import { PrayerCard } from '../components/PrayerCard'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import { usePrayerRequests } from '../hooks/usePrayerRequests'
import { useGroups } from '../hooks/useGroups'

export function Answered() {
  const { requests: personal, loading: personalLoading, prayFor, markAnswered, archiveRequest } = usePrayerRequests({ answered: true })
  const { loading: groupsLoading } = useGroups()

  const loading = personalLoading || groupsLoading

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">Answered prayers</h1>
        <p className="mt-1 text-stone-500">A record of prayers that were answered.</p>
      </div>

      {loading && <PageLoader />}

      {!loading && personal.length === 0 && (
        <EmptyState
          title="No answered prayers yet."
          description="When you mark a prayer as answered, it will appear here — a quiet record of faithfulness."
        />
      )}

      {!loading && personal.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-lg font-medium text-stone-600">Personal</h2>
          <ul className="flex flex-col gap-3" role="list">
            {personal.map(r => (
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
        </section>
      )}
    </Layout>
  )
}
