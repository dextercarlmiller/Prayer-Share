import { useState } from 'react'
import { PrayerRequest } from '../types'
import { LoadingSpinner } from './LoadingSpinner'

interface PrayerCardProps {
  request: PrayerRequest
  showAuthor?: boolean
  onPrayFor: (id: string) => Promise<{ error: Error | null }>
  onMarkAnswered: (id: string) => Promise<{ error: Error | null }>
  onArchive: (id: string) => Promise<{ error: Error | null }>
}

export function PrayerCard({ request, showAuthor = false, onPrayFor, onMarkAnswered, onArchive }: PrayerCardProps) {
  const [prayingLoading, setPrayingLoading] = useState(false)
  const [answerLoading, setAnswerLoading] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const date = new Date(request.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const answeredDate = request.answered_at
    ? new Date(request.answered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  async function handlePrayFor() {
    if (prayingLoading) return
    setPrayingLoading(true)
    await onPrayFor(request.id)
    setPrayingLoading(false)
  }

  async function handleMarkAnswered() {
    setAnswerLoading(true)
    await onMarkAnswered(request.id)
    setAnswerLoading(false)
  }

  return (
    <article className="rounded-2xl border border-amber-200 bg-cream px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg font-medium leading-snug text-stone-800">{request.title}</h3>
          {request.is_answered && (
            <span className="mt-0.5 shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Answered
            </span>
          )}
        </div>

        {request.details && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-600">{request.details}</p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
        {showAuthor && request.profiles?.first_name && (
          <span>{request.profiles.first_name}</span>
        )}
        <span>{date}</span>
        {request.is_answered && answeredDate && (
          <span>Answered {answeredDate}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handlePrayFor}
          disabled={prayingLoading}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-all ${
            request.user_has_prayed_today
              ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
              : 'bg-white text-stone-600 hover:bg-amber-50 hover:text-amber-700 border border-amber-200'
          }`}
          aria-label="I prayed for this"
        >
          {prayingLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <span aria-hidden="true">{request.user_has_prayed_today ? '✦' : '○'}</span>
          )}
          <span>
            {(request.prayed_for_count ?? 0) > 0
              ? `Prayed for ${request.prayed_for_count} ${request.prayed_for_count === 1 ? 'time' : 'times'}`
              : 'I prayed for this'}
          </span>
        </button>

        {!request.is_answered && (
          <button
            onClick={handleMarkAnswered}
            disabled={answerLoading}
            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3.5 py-1.5 text-sm text-stone-600 transition-all hover:bg-green-50 hover:text-green-700 hover:border-green-200"
            aria-label="Mark as answered"
          >
            {answerLoading ? <LoadingSpinner size="sm" /> : null}
            Mark answered
          </button>
        )}

        {!confirmArchive ? (
          <button
            onClick={() => setConfirmArchive(true)}
            className="rounded-full px-3.5 py-1.5 text-sm text-stone-400 transition-colors hover:text-stone-600"
            aria-label="Archive this prayer"
          >
            Archive
          </button>
        ) : (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-stone-500">Archive this prayer?</span>
            <button onClick={() => onArchive(request.id)} className="font-medium text-stone-700 underline">
              Yes
            </button>
            <button onClick={() => setConfirmArchive(false)} className="text-stone-400">
              No
            </button>
          </span>
        )}
      </div>
    </article>
  )
}
