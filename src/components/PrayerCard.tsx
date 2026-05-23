import { useState } from 'react'
import { PrayerRequest, PrayerStatus } from '../types'
import { LoadingSpinner } from './LoadingSpinner'

interface PrayerCardProps {
  request: PrayerRequest
  showAuthor?: boolean
  currentUserId?: string
  onPrayFor: (id: string) => Promise<{ error: Error | null }>
  onMarkAnswered: (id: string) => Promise<{ error: Error | null }>
  onArchive: (id: string) => Promise<{ error: Error | null }>
  onUpdateStatus?: (id: string, status: PrayerStatus, answeredNote?: string) => Promise<{ error: Error | null }>
}

const STATUS_BADGE: Record<PrayerStatus, string> = {
  praying: 'bg-yellow-100 text-yellow-700',
  answered: 'bg-green-100 text-green-700',
  ongoing: 'bg-blue-100 text-blue-700',
  entrusted: 'bg-stone-100 text-stone-500',
}

const STATUS_LABEL: Record<PrayerStatus, string> = {
  praying: 'Praying',
  answered: 'Answered',
  ongoing: 'Ongoing',
  entrusted: 'Entrusted',
}

export function PrayerCard({
  request,
  showAuthor = false,
  currentUserId,
  onPrayFor,
  onMarkAnswered,
  onArchive,
  onUpdateStatus,
}: PrayerCardProps) {
  const [prayingLoading, setPrayingLoading] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [answerFlow, setAnswerFlow] = useState(false)
  const [answerNote, setAnswerNote] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)

  const status = request.status ?? (request.is_answered ? 'answered' : 'praying')
  const isEntrusted = status === 'entrusted'
  const isOwner = currentUserId != null && currentUserId === request.user_id
  const prayCount = request.pray_count ?? request.prayed_for_count ?? 0

  const date = new Date(request.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const avatarInitials = request.is_anonymous
    ? 'AN'
    : showAuthor
    ? (request.profiles?.first_name?.slice(0, 2).toUpperCase() ?? 'ME')
    : 'ME'

  const authorLabel = request.is_anonymous
    ? 'Anonymous'
    : showAuthor
    ? (request.profiles?.first_name ?? 'Unknown')
    : 'You'

  const showReadMore = (request.details?.length ?? 0) > 220

  async function handlePrayFor() {
    if (prayingLoading || request.user_has_prayed_today) return
    setPrayingLoading(true)
    await onPrayFor(request.id)
    setPrayingLoading(false)
  }

  async function handleUpdateStatus(newStatus: PrayerStatus, note?: string) {
    setStatusLoading(true)
    setMenuOpen(false)
    setAnswerFlow(false)
    if (onUpdateStatus) {
      await onUpdateStatus(request.id, newStatus, note || undefined)
    } else if (newStatus === 'answered') {
      await onMarkAnswered(request.id)
    }
    setStatusLoading(false)
  }

  return (
    <article
      className={`relative rounded-2xl border px-5 py-4 shadow-sm transition-shadow hover:shadow-md ${
        isEntrusted
          ? 'border-stone-200 bg-stone-50 opacity-70'
          : 'border-amber-200 bg-cream'
      }`}
    >
      {/* Header row — category pill (left) + status badge + menu (right) */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          {request.category ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {request.category}
            </span>
          ) : (
            <span />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>

          {/* Owner status menu */}
          {isOwner && onUpdateStatus && (
            <div className="relative">
              <button
                onClick={() => { setMenuOpen(o => !o); setAnswerFlow(false) }}
                disabled={statusLoading}
                className="rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                aria-label="Prayer options"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <circle cx="4" cy="10" r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="16" cy="10" r="1.5" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  {/* Backdrop to close on outside click */}
                  <button
                    className="fixed inset-0 z-[9]"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <div className="absolute right-0 top-7 z-10 w-48 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={() => { setAnswerFlow(true); setMenuOpen(false) }}
                      className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-amber-50"
                    >
                      Mark as Answered
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('ongoing')}
                      className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-amber-50"
                    >
                      Mark as Ongoing
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('entrusted')}
                      className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-amber-50"
                    >
                      Mark as Entrusted
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline "Mark as Answered" praise note prompt */}
      {answerFlow && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-3">
          <p className="mb-2 text-sm font-medium text-green-800">Add a praise note (optional)</p>
          <textarea
            value={answerNote}
            onChange={e => setAnswerNote(e.target.value)}
            placeholder="How did God answer this prayer?"
            className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-300"
            rows={2}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleUpdateStatus('answered', answerNote)}
              disabled={statusLoading}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              Confirm
            </button>
            <button
              onClick={() => setAnswerFlow(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <h3
        className="mb-1.5 font-serif text-lg font-medium leading-snug text-stone-800"
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden',
        }}
      >
        {request.title}
      </h3>

      {/* Description */}
      {request.details && (
        <div className="mb-3">
          <p
            className={`text-sm leading-relaxed text-stone-600 ${
              !expanded ? 'line-clamp-3' : ''
            }`}
          >
            {request.details}
          </p>
          {showReadMore && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-0.5 text-xs font-medium text-amber-700 hover:underline"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Praise note — shown when answered and note exists */}
      {status === 'answered' && request.answered_note && (
        <div className="mb-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2.5">
          <p className="mb-1 text-xs font-semibold text-green-700">Praise report</p>
          <p className="text-sm leading-relaxed text-green-800">{request.answered_note}</p>
        </div>
      )}

      {/* Requester row */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <span className="text-[10px] font-bold leading-none text-amber-700">{avatarInitials}</span>
        </div>
        <span className="text-xs text-stone-500">
          {authorLabel} · {date}
        </span>
      </div>

      {/* Footer row — pray counter (left) + actions (right) */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-stone-500">
          🕊 {prayCount} {prayCount === 1 ? 'person' : 'people'} prayed
        </span>

        <div className="flex items-center gap-2">
          {/* Archive */}
          {!confirmArchive ? (
            <button
              onClick={() => setConfirmArchive(true)}
              className="rounded-full px-3 py-1.5 text-xs text-stone-400 transition-colors hover:text-stone-600"
              aria-label="Archive this prayer"
            >
              Archive
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-500">Archive?</span>
              <button
                onClick={() => onArchive(request.id)}
                className="font-medium text-stone-700 underline"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmArchive(false)}
                className="text-stone-400"
              >
                No
              </button>
            </span>
          )}

          {/* I Prayed button */}
          <button
            onClick={handlePrayFor}
            disabled={prayingLoading || request.user_has_prayed_today}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              request.user_has_prayed_today
                ? 'bg-amber-500 text-white'
                : 'border border-amber-200 bg-white text-stone-600 hover:bg-amber-50 hover:text-amber-700'
            }`}
            aria-label={
              request.user_has_prayed_today
                ? 'You prayed for this today'
                : 'I prayed for this'
            }
          >
            {prayingLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span aria-hidden="true">
                {request.user_has_prayed_today ? '✦' : '○'}
              </span>
            )}
            <span>{request.user_has_prayed_today ? 'Prayed' : 'I Prayed'}</span>
          </button>
        </div>
      </div>
    </article>
  )
}
