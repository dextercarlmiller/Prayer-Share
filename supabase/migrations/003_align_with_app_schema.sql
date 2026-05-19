-- ============================================================
-- Migration 003: Align DB schema with app code
--
-- The app uses: profiles (with new columns), prayer_items,
-- prayer_shares, prayer_counts, invites.
-- This migration:
--   1. Adds missing profile columns
--   2. Backfills username/display_name from existing email data
--   3. Fixes handle_new_user trigger to populate the new columns
--   4. Fixes group_invites_select RLS (removes OR TRUE)
--   5. Creates prayer_items, prayer_shares, prayer_counts, invites
--      with RLS and indexes
-- ============================================================

-- ============================================================
-- 1. Add missing profile columns
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS push_token   TEXT,
  ADD COLUMN IF NOT EXISTS reminder_time TEXT;

-- ============================================================
-- 2. Backfill username / display_name for existing rows using
--    the email column that was already on this table.
-- ============================================================

UPDATE public.profiles
SET
  username     = COALESCE(NULLIF(username, ''),     split_part(email, '@', 1)),
  display_name = COALESCE(NULLIF(display_name, ''), split_part(email, '@', 1))
WHERE email IS NOT NULL AND email <> ''
  AND (username IS NULL OR display_name IS NULL);

-- ============================================================
-- 3. Fix handle_new_user trigger: populate username + display_name
--    instead of first_name + email.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username',     split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate trigger in case it was pointing at an older version of the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 4. Fix group_invites_select RLS — remove "OR TRUE" which
--    bypassed row-level security entirely. Users can now see
--    invites sent to their own email, invites they created, or
--    invites for groups they belong to.
-- ============================================================

DROP POLICY IF EXISTS "group_invites_select" ON public.group_invites;

CREATE POLICY "group_invites_select" ON public.group_invites FOR SELECT USING (
  invited_by = auth.uid()
  OR group_id IN (SELECT public.get_my_group_ids())
  OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- ============================================================
-- 5. Create enum types (idempotent)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.prayer_category AS ENUM
    ('Health', 'Family', 'Work', 'Relationships', 'Financial', 'Spiritual', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.prayer_item_type AS ENUM ('request', 'praise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. Create prayer_items — the core table the app reads/writes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prayer_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 120),
  description TEXT NOT NULL DEFAULT '',
  category    public.prayer_category NOT NULL DEFAULT 'Spiritual',
  type        public.prayer_item_type NOT NULL DEFAULT 'request',
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prayer_items_updated_at ON public.prayer_items;
CREATE TRIGGER prayer_items_updated_at
  BEFORE UPDATE ON public.prayer_items
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- 7. Create prayer_shares — who a prayer item is shared with
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prayer_shares (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prayer_item_id      UUID NOT NULL REFERENCES public.prayer_items(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prayer_item_id, shared_with_user_id)
);

-- ============================================================
-- 8. Create prayer_counts — one record per user per prayer item
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prayer_counts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prayer_item_id    UUID NOT NULL REFERENCES public.prayer_items(id) ON DELETE CASCADE,
  prayed_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prayed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prayer_item_id, prayed_by_user_id)
);

-- ============================================================
-- 9. Create invites — shareable invite links tied to a prayer item
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invites (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email          TEXT,
  token          TEXT UNIQUE NOT NULL,
  prayer_item_id UUID REFERENCES public.prayer_items(id) ON DELETE SET NULL,
  accepted_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. Enable RLS on new tables
-- ============================================================

ALTER TABLE public.prayer_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. RLS policies for prayer_items
-- ============================================================

DROP POLICY IF EXISTS "prayer_items_read"   ON public.prayer_items;
DROP POLICY IF EXISTS "prayer_items_insert" ON public.prayer_items;
DROP POLICY IF EXISTS "prayer_items_update" ON public.prayer_items;
DROP POLICY IF EXISTS "prayer_items_delete" ON public.prayer_items;

CREATE POLICY "prayer_items_read" ON public.prayer_items FOR SELECT USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.prayer_shares ps
    WHERE ps.prayer_item_id = id AND ps.shared_with_user_id = auth.uid()
  )
);
CREATE POLICY "prayer_items_insert" ON public.prayer_items FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "prayer_items_update" ON public.prayer_items FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "prayer_items_delete" ON public.prayer_items FOR DELETE USING (owner_id = auth.uid());

-- ============================================================
-- 12. RLS policies for prayer_shares
-- ============================================================

DROP POLICY IF EXISTS "prayer_shares_read"   ON public.prayer_shares;
DROP POLICY IF EXISTS "prayer_shares_insert" ON public.prayer_shares;
DROP POLICY IF EXISTS "prayer_shares_delete" ON public.prayer_shares;

CREATE POLICY "prayer_shares_read" ON public.prayer_shares FOR SELECT USING (
  shared_with_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.prayer_items pi
    WHERE pi.id = prayer_item_id AND pi.owner_id = auth.uid()
  )
);
CREATE POLICY "prayer_shares_insert" ON public.prayer_shares FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prayer_items pi
    WHERE pi.id = prayer_item_id AND pi.owner_id = auth.uid()
  )
);
CREATE POLICY "prayer_shares_delete" ON public.prayer_shares FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.prayer_items pi
    WHERE pi.id = prayer_item_id AND pi.owner_id = auth.uid()
  )
);

-- ============================================================
-- 13. RLS policies for prayer_counts
-- ============================================================

DROP POLICY IF EXISTS "prayer_counts_read"   ON public.prayer_counts;
DROP POLICY IF EXISTS "prayer_counts_insert" ON public.prayer_counts;
DROP POLICY IF EXISTS "prayer_counts_delete" ON public.prayer_counts;

CREATE POLICY "prayer_counts_read" ON public.prayer_counts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.prayer_items pi
    WHERE pi.id = prayer_item_id
      AND (
        pi.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.prayer_shares ps
          WHERE ps.prayer_item_id = pi.id AND ps.shared_with_user_id = auth.uid()
        )
      )
  )
);
CREATE POLICY "prayer_counts_insert" ON public.prayer_counts FOR INSERT WITH CHECK (prayed_by_user_id = auth.uid());
CREATE POLICY "prayer_counts_delete" ON public.prayer_counts FOR DELETE USING (prayed_by_user_id = auth.uid());

-- ============================================================
-- 14. RLS policies for invites
-- ============================================================

DROP POLICY IF EXISTS "invites_owner_all"     ON public.invites;
DROP POLICY IF EXISTS "invites_read_by_token" ON public.invites;

-- Owners can do everything; anyone authenticated can read (token-based accept flow)
CREATE POLICY "invites_owner_all" ON public.invites
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "invites_read_by_token" ON public.invites
  FOR SELECT
  USING (true);

-- ============================================================
-- 15. Indexes for new tables
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_prayer_items_owner_id    ON public.prayer_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_prayer_items_type        ON public.prayer_items(type);
CREATE INDEX IF NOT EXISTS idx_prayer_items_is_resolved ON public.prayer_items(is_resolved);
CREATE INDEX IF NOT EXISTS idx_prayer_shares_shared_with ON public.prayer_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_counts_item       ON public.prayer_counts(prayer_item_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username        ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_invites_token            ON public.invites(token);
