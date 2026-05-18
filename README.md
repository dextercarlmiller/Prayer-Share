# PrayerShare

A quiet place to keep and share your prayers.

PrayerShare is a focused web app for managing personal prayer requests and sharing them within small, private groups — family, friends, a small group at church. No ads, no gamification, no social feed. Just a simple list.

---

## Tech stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend / Auth / Database**: Supabase (Postgres with Row Level Security)
- **Deployment**: Cloudflare Pages

---

## Local development

### 1. Clone and install

```bash
git clone https://github.com/dextercarlmiller/prayer-share.git
cd prayer-share
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Start the dev server

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

---

## Connecting Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, go to **SQL Editor**.
3. Paste the contents of `supabase/schema.sql` and run it. This creates all tables, RLS policies, triggers, and indexes.
4. Copy your **Project URL** and **anon public key** from **Settings → API** into your `.env` file.
5. In **Authentication → Email**, make sure "Confirm email" is enabled.

---

## Deploying to Cloudflare Pages

1. Push your repository to GitHub.
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/) and connect your GitHub repo.
3. Set the build configuration:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
   - **Node.js version**: 18 or higher
4. Add environment variables in the Cloudflare Pages dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. The `public/_redirects` file handles SPA routing so all paths resolve to `index.html`.

---

## Project structure

```
src/
  components/   Shared UI components (PrayerCard, Modal, Navigation, …)
  context/      React context for auth state
  hooks/        Data-fetching hooks (usePrayerRequests, useGroups, …)
  lib/          Supabase client
  pages/        One file per route
  types/        TypeScript types
supabase/
  schema.sql    Full database schema — run this in Supabase SQL Editor
public/
  _redirects    Cloudflare Pages SPA routing
```

---

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |
