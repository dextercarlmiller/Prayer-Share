import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { PrayerCard } from '../components/PrayerCard'
import { AddPrayerForm } from '../components/AddPrayerForm'
import { InviteModal } from '../components/InviteModal'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import { usePrayerRequests } from '../hooks/usePrayerRequests'
import { useGroups, useGroupInvites, useGroupRole } from '../hooks/useGroups'
import { useAuthContext } from '../context/AuthContext'

export function GroupView() {
  const { id } = useParams<{ id: string }>()
  const groupId = id ?? ''
  const { user } = useAuthContext()
  const { groups, loading: groupsLoading, inviteMember } = useGroups()
  const group = groups.find(g => g.id === groupId)
  const { requests, loading, error, addRequest, markAnswered, updateStatus, archiveRequest, prayFor } = usePrayerRequests({ groupId })
  const { invites } = useGroupInvites(groupId)
  const role = useGroupRole(groupId)

  const [addFormOpen, setAddFormOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const groupName = group?.name ?? 'Group'

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-800">
              {groupsLoading ? '…' : groupName}
            </h1>
            <div className="mt-1 flex flex-wrap gap-3">
              <button
                onClick={() => setInviteOpen(true)}
                className="text-sm text-amber-700 hover:underline"
              >
                Invite someone
              </button>
              {role === 'admin' && (
                <Link to={`/groups/${groupId}/settings`} className="text-sm text-stone-400 hover:text-stone-600">
                  Settings
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={() => setAddFormOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            aria-label="Add a prayer to this group"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add prayer
          </button>
        </div>
      </div>

      {loading && <PageLoader />}
      {!loading && error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && requests.length === 0 && (
        <EmptyState
          title="No prayers here yet."
          description="Add the first one for this group — even just a name."
          action={
            <button
              onClick={() => setAddFormOpen(true)}
              className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700"
            >
              Add a prayer
            </button>
          }
        />
      )}

      {!loading && !error && requests.length > 0 && (
        <ul className="flex flex-col gap-3" role="list" aria-label={`${groupName} prayer requests`}>
          {requests.map(r => (
            <li key={r.id}>
              <PrayerCard
                request={r}
                showAuthor
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

      <AddPrayerForm
        isOpen={addFormOpen}
        onClose={() => setAddFormOpen(false)}
        onAdd={(title, details) => addRequest(title, details, groupId)}
      />

      <InviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={email => inviteMember(groupId, email)}
        pendingInvites={invites}
      />
    </Layout>
  )
}

