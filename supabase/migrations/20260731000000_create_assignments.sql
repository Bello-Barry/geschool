-- Migration: Create assignments (Devoirs & TD/TP) tables
-- Dependencies: schools, teachers, subjects, classes, terms, students

-- 1. ASSIGNMENTS TABLE
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  teacher_id UUID REFERENCES teachers(id) NOT NULL,
  subject_id UUID REFERENCES subjects(id) NOT NULL,
  class_id UUID REFERENCES classes(id) NOT NULL,
  term_id UUID REFERENCES terms(id),
  type TEXT NOT NULL CHECK (type IN ('devoir_maison', 'td', 'tp')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search vector
ALTER TABLE assignments ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED;

-- 2. ASSIGNMENT ATTACHMENTS
CREATE TABLE assignment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ASSIGNMENT COMPLETIONS
CREATE TABLE assignment_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- 4. INDEXES
CREATE INDEX idx_assignments_class ON assignments(class_id, status, due_date);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_school ON assignments(school_id);
CREATE INDEX idx_assignments_search ON assignments USING GIN (search_vector);
CREATE INDEX idx_assignment_attachments_assignment ON assignment_attachments(assignment_id);
CREATE INDEX idx_assignment_completions_assignment ON assignment_completions(assignment_id);
CREATE INDEX idx_assignment_completions_student ON assignment_completions(student_id);

-- 5. UPDATED_AT TRIGGER
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. ROW LEVEL SECURITY
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_completions ENABLE ROW LEVEL SECURITY;

-- assignments SELECT
CREATE POLICY "assignments_select" ON assignments FOR SELECT TO authenticated
USING (
  private.is_school_admin(school_id)
  OR
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  OR
  (
    status = 'published'
    AND class_id IN (
      SELECT class_id FROM students WHERE user_id = auth.uid()
    )
  )
  OR
  (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN students s ON s.id = sp.student_id
      JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
        AND s.class_id = assignments.class_id
    )
  )
);

-- assignments INSERT: teacher must be assigned to this subject+class
CREATE POLICY "assignments_insert" ON assignments FOR INSERT TO authenticated
WITH CHECK (
  private.is_school_admin(school_id)
  OR
  EXISTS (
    SELECT 1 FROM teacher_subjects ts
    WHERE ts.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      AND ts.subject_id = assignments.subject_id
      AND ts.class_id = assignments.class_id
  )
);

-- assignments UPDATE: owner teacher or school admin
CREATE POLICY "assignments_update" ON assignments FOR UPDATE TO authenticated
USING (
  private.is_school_admin(school_id)
  OR
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
);

-- assignments DELETE: owner teacher or school admin
CREATE POLICY "assignments_delete" ON assignments FOR DELETE TO authenticated
USING (
  private.is_school_admin(school_id)
  OR
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
);

-- assignment_attachments SELECT: follows assignment visibility
CREATE POLICY "assignment_attachments_select" ON assignment_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignments WHERE id = assignment_id
    AND (
      private.is_school_admin(school_id)
      OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      OR (
        status = 'published'
        AND class_id IN (SELECT class_id FROM students WHERE user_id = auth.uid())
      )
      OR (
        status = 'published'
        AND EXISTS (
          SELECT 1 FROM student_parents sp
          JOIN students s ON s.id = sp.student_id
          JOIN parents p ON p.id = sp.parent_id
          WHERE p.user_id = auth.uid()
            AND s.class_id = assignments.class_id
        )
      )
    )
  )
);

-- assignment_attachments INSERT: assignment owner or admin
CREATE POLICY "assignment_attachments_insert" ON assignment_attachments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assignments WHERE id = assignment_id
    AND (
      private.is_school_admin(school_id)
      OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
);

-- assignment_attachments DELETE: assignment owner or admin
CREATE POLICY "assignment_attachments_delete" ON assignment_attachments FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assignments WHERE id = assignment_id
    AND (
      private.is_school_admin(school_id)
      OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
);

-- assignment_completions SELECT: student sees own, teacher sees his class, parent sees children, admin sees all
CREATE POLICY "assignment_completions_select" ON assignment_completions FOR SELECT TO authenticated
USING (
  private.is_school_admin((SELECT school_id FROM assignments WHERE id = assignment_id))
  OR
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM assignments
    WHERE id = assignment_id
      AND teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM student_parents sp
    WHERE sp.student_id = assignment_completions.student_id
      AND sp.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
  )
);

-- assignment_completions INSERT: only the student themselves (student_id resolved from session, never client-supplied)
CREATE POLICY "assignment_completions_insert" ON assignment_completions FOR INSERT TO authenticated
WITH CHECK (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);

-- assignment_completions DELETE: only the student themselves (un-toggle)
CREATE POLICY "assignment_completions_delete" ON assignment_completions FOR DELETE TO authenticated
USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);

-- 7. STORAGE BUCKET for assignment attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-attachments',
  'assignment-attachments',
  false,
  10485760,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "assignment_attachments_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignment-attachments');

CREATE POLICY "assignment_attachments_download" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'assignment-attachments');
