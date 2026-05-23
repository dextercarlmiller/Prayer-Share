-- ============================================================
-- Migration 005: Prayer card redesign
-- Adds status system, pray counter, prayer_interactions table
-- ============================================================

-- 1. Add new columns to prayer_requests
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'praying'
    CHECK (status IN ('praying', 'answered', 'ongoing', 'entrusted')),
  ADD COLUMN IF NOT EXISTS pray_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS answered_note TEXT,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verse TEXT;

-- 2. Sync status with existing is_answered flag for historical rows
UPDATE public.prayer_requests
  SET status = 'answered'
  WHERE is_answered = TRUE AND status = 'praying';

-- 3. Backfill pray_count from existing prayed_for_events
UPDATE public.prayer_requests pr
  SET pray_count = (
    SELECT COUNT(*) FROM public.prayed_for_events pfe
    WHERE pfe.request_id = pr.id
  );

-- 4. Create prayer_interactions table
--    Unique constraint: one interaction per (prayer, user) per calendar day
CREATE TABLE IF NOT EXISTS public.prayer_interactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prayer_id   UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prayed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prayed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (prayer_id, user_id, prayed_date)
);

-- 5. RLS on prayer_interactions
ALTER TABLE public.prayer_interactions ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can see who prayed (for the counter)
CREATE POLICY "prayer_interactions_select" ON public.prayer_interactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can only insert their own rows
CREATE POLICY "prayer_interactions_insert" ON public.prayer_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can remove their own rows
CREATE POLICY "prayer_interactions_delete" ON public.prayer_interactions
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Indexes for common queries
CREATE INDEX IF NOT EXISTS prayer_interactions_prayer_id_idx
  ON public.prayer_interactions (prayer_id);

CREATE INDEX IF NOT EXISTS prayer_interactions_user_today_idx
  ON public.prayer_interactions (prayer_id, user_id, prayed_date);

-- 7. Trigger: auto-increment pray_count when a new interaction is inserted
CREATE OR REPLACE FUNCTION public.update_pray_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.prayer_requests
  SET pray_count = pray_count + 1
  WHERE id = NEW.prayer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prayer_interactions_count_trigger ON public.prayer_interactions;

CREATE TRIGGER prayer_interactions_count_trigger
  AFTER INSERT ON public.prayer_interactions
  FOR EACH ROW EXECUTE FUNCTION public.update_pray_count();
