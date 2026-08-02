-- Chantier 19: Échéances mensuelles de scolarité
-- NOTE: The monthly_dues table and payments.monthly_due_id column were already
-- created manually in the remote DB. This migration is idempotent and only adds
-- missing pieces (schema is a no-op if present; RLS policies are dropped/recreated).

-- 1. Table monthly_dues (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS monthly_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, period_year, period_month)
);

-- 2. Link payments to their monthly due (IF NOT EXISTS)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS monthly_due_id UUID REFERENCES monthly_dues(id) ON DELETE SET NULL;

-- 3. RLS
ALTER TABLE monthly_dues ENABLE ROW LEVEL SECURITY;

-- Admin (school admin / super_admin): full CRUD on their school's dues
DROP POLICY IF EXISTS "monthly_dues_admin_all" ON monthly_dues;
CREATE POLICY "monthly_dues_admin_all" ON monthly_dues
FOR ALL TO authenticated
USING (private.is_school_admin(school_id))
WITH CHECK (private.is_school_admin(school_id));

-- Parent: can only read their own children's dues
DROP POLICY IF EXISTS "monthly_dues_parent_select" ON monthly_dues;
CREATE POLICY "monthly_dues_parent_select" ON monthly_dues
FOR SELECT TO authenticated
USING (private.is_parent_of_student(student_id));
