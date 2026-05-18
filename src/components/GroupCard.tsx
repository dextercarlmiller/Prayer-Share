import { Link } from 'react-router-dom'
import { PrayerGroup } from '../types'

interface GroupCardProps {
  group: PrayerGroup
}

export function GroupCard({ group }: GroupCardProps) {
  const latestDate = group.latest_request_at
    ? new Date(group.latest_request_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <Link
      to={`/groups/${group.id}`}
      className="block rounded-2xl border border-amber-200 bg-cream px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
      aria-label={`Open ${group.name} group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-medium text-stone-800">{group.name}</h3>
          <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-stone-500">
            <span>
              {group.member_count ?? 0} {(group.member_count ?? 0) === 1 ? 'member' : 'members'}
            </span>
            {latestDate && <span>Last prayer {latestDate}</span>}
          </div>
        </div>
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
