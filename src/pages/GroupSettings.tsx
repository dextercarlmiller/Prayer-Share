import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner'
import { useGroups, useGroupMembers, useGroupRole } from '../hooks/useGroups'
import { useAuthContext } from '../context/AuthContext'

export function GroupSettings() {
  const { id } = useParams<{ id: string }>()
  const groupId = id ?? ''
  const { user } = useAuthContext()
  const role = useGroupRole(groupId)
  const { groups, removeMember, leaveGroup } = useGroups()
  const { members, loading: membersLoading, refetch } = useGroupMembers(groupId)
  const navigate = useNavigate()
  const [removing, setRemoving] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  const group = groups.find(g => g.id === groupId)

  if (role !== null && role !== 'admin') return <Navigate to={`/groups/${groupId}`} replace />

  async function handleRemove(userId: string) {
    setRemoving(userId)
    await removeMember(groupId, userId)
    await refetch()
    setRemoving(null)
  }

  async function handleLeave() {
    setLeaving(true)
    await leaveGroup(groupId)
    navigate('/groups')
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">
          {group?.name ?? 'Group'} — Settings
        </h1>
      </div>

      <section className="mb-8 max-w-lg">
        <h2 className="mb-3 font-serif text-lg font-medium text-stone-700">Members</h2>

        {membersLoading ? (
          <PageLoader />
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {members.map(m => {
              const isMe = m.user_id === user?.id
              const name = m.profiles?.first_name ?? m.profiles?.email ?? 'Member'
              return (
                <li key={m.id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-cream px-4 py-3">
                  <div>
                    <span className="font-medium text-stone-700">{name}</span>
                    {m.role === 'admin' && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Admin</span>
                    )}
                    {isMe && <span className="ml-2 text-xs text-stone-400">(you)</span>}
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      disabled={removing === m.user_id}
                      className="flex items-center gap-1 text-sm text-stone-400 transition-colors hover:text-red-600"
                      aria-label={`Remove ${name} from group`}
                    >
                      {removing === m.user_id ? <LoadingSpinner size="sm" /> : 'Remove'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="max-w-lg rounded-2xl border border-red-100 bg-red-50 p-5">
        <h2 className="mb-1 font-medium text-red-800">Leave this group</h2>
        <p className="mb-4 text-sm text-red-700">
          You'll no longer have access to the group's prayers. This cannot be undone.
        </p>
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {leaving && <LoadingSpinner size="sm" />}
          Leave group
        </button>
      </section>
    </Layout>
  )
}
