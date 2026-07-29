-- Chantier 18: Paiements de scolarite - flux manuel (declaration parent -> validation admin -> recu)

-- Add columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'confirmed', 'rejected'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS declared_by UUID REFERENCES users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT
  CHECK (payment_method IN ('cash', 'mobile_money', 'bank_transfer', 'check'));

-- Add due_date to tuition_fees
ALTER TABLE tuition_fees ADD COLUMN IF NOT EXISTS due_date DATE;

-- Receipt bucket
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('receipts', 'receipts', false, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS: parents can INSERT payments (declare)
DROP POLICY IF EXISTS "payments_parent_insert" ON payments;
CREATE POLICY "payments_parent_insert" ON payments
FOR INSERT TO authenticated
WITH CHECK (
  school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
  AND
  declared_by = auth.uid()
  AND
  status = 'pending'
);

-- RLS: admin can UPDATE payments (validate/reject)
DROP POLICY IF EXISTS "payments_admin_update" ON payments;
CREATE POLICY "payments_admin_update" ON payments
FOR UPDATE TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM users
    WHERE id = auth.uid() AND role IN ('admin_school', 'super_admin')
  )
);

-- RLS: parents can only see their own children's payments
DROP POLICY IF EXISTS "payments_parent_view" ON payments;
CREATE POLICY "payments_parent_view" ON payments
FOR SELECT TO authenticated
USING (
  school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin_school', 'super_admin')
    OR
    student_id IN (
      SELECT sp.student_id FROM student_parents sp
      JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
    )
  )
);

-- Drop old payment policies that conflict
DROP POLICY IF EXISTS "payments_view" ON payments;
DROP POLICY IF EXISTS "payments_modify" ON payments;
