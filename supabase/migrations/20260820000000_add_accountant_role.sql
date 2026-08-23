-- Phase 1 : Ajout du rôle "comptable" (accountant) — accès strict (lecture seule des finances)
-- À appliquer manuellement sur la DB distante (workflow du repo).

-- 1. Étendre la contrainte CHECK de users.role
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin_school', 'teacher', 'parent', 'student', 'accountant'));

-- 2. RLS : le comptable peut LIRE les paiements de son école (jamais écrire)
DROP POLICY IF EXISTS "payments_accountant_view" ON payments;
CREATE POLICY "payments_accountant_view" ON payments
  FOR SELECT TO authenticated
  USING (
    school_id = ANY (
      SELECT u.school_id FROM users u
      WHERE u.id = auth.uid() AND u.role = 'accountant'
    )
  );

-- 3. RLS : le comptable peut LIRE les échéances mensuelles de son école
DROP POLICY IF EXISTS "monthly_dues_accountant_view" ON monthly_dues;
CREATE POLICY "monthly_dues_accountant_view" ON monthly_dues
  FOR SELECT TO authenticated
  USING (
    school_id = ANY (
      SELECT u.school_id FROM users u
      WHERE u.id = auth.uid() AND u.role = 'accountant'
    )
  );