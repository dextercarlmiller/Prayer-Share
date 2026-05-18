import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { GroupCard } from '../components/GroupCard'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import { useGroups } from '../hooks/useGroups'

export function Groups() {
  const { groups, loading, error } = useGroups()

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">Groups</h1>
        <Link
          to="/groups/new"
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New group
        </Link>
      </div>

      {loading && <PageLoader />}
      {!loading && error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <EmptyState
          title="No groups yet."
          description="Create a group to share prayers with family, friends, or your small group."
          action={
            <Link
              to="/groups/new"
              className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700"
            >
              Create a group
            </Link>
          }
        />
      )}

      {!loading && !error && groups.length > 0 && (
        <ul className="flex flex-col gap-3" role="list" aria-label="Prayer groups">
          {groups.map(g => (
            <li key={g.id}>
              <GroupCard group={g} />
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}
