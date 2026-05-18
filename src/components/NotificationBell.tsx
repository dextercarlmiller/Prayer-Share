import { useEffect, useRef, useState } from 'react'
import { Notification } from '../types'

interface NotificationBellProps {
  unreadCount: number
  notifications: Notification[]
  onOpen: () => void
}

export function NotificationBell({ unreadCount, notifications, onOpen }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function toggleOpen() {
    if (!open && unreadCount > 0) onOpen()
    setOpen(o => !o)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="relative rounded-full p-2 text-stone-500 transition-colors hover:bg-amber-100 hover:text-stone-700"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-amber-200 bg-parchment shadow-lg">
          <div className="border-b border-amber-100 px-4 py-3">
            <h2 className="font-serif text-base font-semibold text-stone-800">Notifications</h2>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-stone-400">Nothing new right now.</li>
            ) : (
              notifications.map(n => (
                <li
                  key={n.id}
                  className={`border-b border-amber-100 px-4 py-3 text-sm last:border-0 ${n.is_read ? 'text-stone-500' : 'font-medium text-stone-700'}`}
                >
                  {n.message}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
