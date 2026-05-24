import { NavLink } from 'react-router-dom'
import { NotificationBell } from './NotificationBell'
import { useNotifications } from '../hooks/useNotifications'

const tabs = [
  {
    to: '/my-list',
    label: 'My List',
    icon: (active: boolean) => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    to: '/groups',
    label: 'Groups',
    icon: (active: boolean) => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/account',
    label: 'Account',
    icon: (active: boolean) => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export function Navigation() {
  const { notifications, unreadCount, markAllRead } = useNotifications()

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden border-b border-amber-200 bg-parchment/95 backdrop-blur-sm sm:block">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="font-serif text-xl font-semibold text-stone-800">PrayerShare</span>
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {tabs.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-stone-500 hover:bg-amber-50 hover:text-stone-700'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <NotificationBell
            unreadCount={unreadCount}
            notifications={notifications}
            onOpen={markAllRead}
          />
        </div>
      </header>

      {/* Mobile top bar — logo + bell */}
      <header className="flex items-center justify-between border-b border-amber-200 bg-parchment/95 px-5 py-4 backdrop-blur-sm sm:hidden">
        <span className="font-serif text-lg font-semibold text-stone-800">PrayerShare</span>
        <NotificationBell
          unreadCount={unreadCount}
          notifications={notifications}
          onOpen={markAllRead}
        />
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-amber-200 bg-parchment/95 pb-safe backdrop-blur-sm sm:hidden"
        aria-label="Main navigation"
      >
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 px-2 py-3 text-xs transition-colors ${
                isActive ? 'text-amber-700' : 'text-stone-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {tab.icon(isActive)}
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
