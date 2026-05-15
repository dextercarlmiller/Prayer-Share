import { Navigation } from './Navigation'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      {/* On mobile, bottom tab bar is ~64px; add matching padding */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
