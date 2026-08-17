-- Chantier 20: Annonces école (table + RLS idempotent)

-- 1. Table announcements (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'teachers', 'parents', 'students')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(audience);

-- 3. Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_announcements_updated_at'
  ) THEN
    CREATE TRIGGER update_announcements_updated_at
      BEFORE UPDATE ON announcements
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 4. RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- SELECT: admin voit tout ; les autres ne voient que les annonces publiées de leur école
-- et dont l'audience correspond à leur rôle (ou 'all').
DROP POLICY IF EXISTS "announcements_admin_all" ON announcements;
DROP POLICY IF EXISTS "announcements_select_access" ON announcements;

CREATE POLICY "announcements_admin_all" ON announcements
FOR ALL TO authenticated
USING (private.is_school_admin(school_id))
WITH CHECK (private.is_school_admin(school_id));

CREATE POLICY "announcements_select_access" ON announcements
FOR SELECT TO authenticated
USING (
  status = 'published'
  AND school_id = private.current_user_school_id()
  AND (
    audience = 'all'
    OR (audience = 'teachers' AND EXISTS (
      SELECT 1 FROM teachers t WHERE t.user_id = auth.uid() AND t.school_id = announcements.school_id
    ))
    OR (audience = 'parents' AND EXISTS (
      SELECT 1 FROM parents p WHERE p.user_id = auth.uid() AND p.school_id = announcements.school_id
    ))
    OR (audience = 'students' AND EXISTS (
      SELECT 1 FROM students s WHERE s.user_id = auth.uid() AND s.school_id = announcements.school_id
    ))
  )
);