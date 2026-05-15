import { Link } from 'react-router-dom'

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-serif text-xl font-semibold text-stone-800">PrayerShare</span>
        <Link
          to="/login"
          className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-700"
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 text-5xl text-amber-400" aria-hidden="true">✦</div>

        <h1 className="mb-4 font-serif text-4xl font-semibold leading-tight text-stone-800 sm:text-5xl">
          A quiet place to keep<br className="hidden sm:block" /> and share your prayers.
        </h1>

        <p className="mb-3 max-w-md leading-relaxed text-stone-600">
          PrayerShare is a simple, private space for your prayer requests — personal ones you hold close, and shared ones for the people you walk through life with.
        </p>
        <p className="mb-3 max-w-md leading-relaxed text-stone-600">
          Add a name, a situation, a need. Share it with a small group. Remember when prayers were answered.
        </p>
        <p className="mb-10 max-w-md leading-relaxed text-stone-600">
          No noise. No notifications demanding your attention. Just a quiet, faithful list.
        </p>

        <Link
          to="/signup"
          className="inline-block rounded-2xl bg-amber-600 px-8 py-4 font-medium text-white shadow-sm transition-all hover:bg-amber-700 hover:shadow-md"
        >
          Get started — it's free
        </Link>

        <p className="mt-4 text-sm text-stone-400">
          Already have an account?{' '}
          <Link to="/login" className="text-stone-600 underline underline-offset-2 hover:text-stone-800">
            Sign in
          </Link>
        </p>

        {/* Placeholder for screenshots */}
        <div className="mt-20 w-full max-w-2xl rounded-3xl border-2 border-dashed border-amber-200 px-8 py-16 text-stone-300">
          <p className="text-sm">App screenshots coming soon</p>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-sm text-stone-400">
        <p>PrayerShare — a quiet place for prayer.</p>
      </footer>
    </div>
  )
}
