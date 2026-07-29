-- Migration: Create TD/TP sessions (replaces old td/tp in assignments)
-- Dependencies: assignments table already exists with td/tp data
-- Dependencies: schools, teachers, subjects, classes, students, terms

-- 1. TD SESSIONS TABLE
CREATE TABLE td_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  teacher_id UUID REFERENCES teachers(id) NOT NULL,
  subject_id UUID REFERENCES subjects(id) NOT NULL,
  class_id UUID REFERENCES classes(id) NOT NULL,
  term_id UUID REFERENCES terms(id),
  type TEXT NOT NULL DEFAULT 'td' CHECK (type IN ('td', 'tp')),
  title TEXT NOT NULL,
  session_date DATE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TD MATERIALS (exercises/PDFs uploaded by teacher)
CREATE TABLE td_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  td_session_id UUID REFERENCES td_sessions(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TD ATTENDANCE (present/absent per student)
CREATE TABLE td_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  td_session_id UUID REFERENCES td_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(td_session_id, student_id)
);

-- 4. INDEXES
CREATE INDEX idx_td_sessions_class ON td_sessions(class_id, status, session_date);
CREATE INDEX idx_td_sessions_teacher ON td_sessions(teacher_id);
CREATE INDEX idx_td_sessions_school ON td_sessions(school_id);
CREATE INDEX idx_td_materials_session ON td_materials(td_session_id);
CREATE INDEX idx_td_attendance_session ON td_attendance(td_session_id);
CREATE INDEX idx_td_attendance_student ON td_attendance(student_id);

-- 5. UPDATED_AT TRIGGER
CREATE TRIGGER update_td_sessions_updated_at
  BEFORE UPDATE ON td_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. ROW LEVEL SECURITY
ALTER TABLE td_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_attendance ENABLE ROW LEVEL SECURITY;

-- td_sessions SELECT: admin (all), teacher (own), student (published, own class), parent (published, child's class)
CREATE POLICY "td_sessions_select" ON td_sessions FOR SELECT TO authenticated
USING (
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
        AND s.class_id = td_sessions.class_id
    )
  )
);

-- td_sessions INSERT: teacher must be assigned to this subject+class, or admin
CREATE POLICY "td_sessions_insert" ON td_sessions FOR INSERT TO authenticated
WITH CHECK (
  private.is_school_admin(school_id)
  OR EXISTS (
    SELECT 1 FROM teacher_subjects ts
    WHERE ts.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      AND ts.subject_id = td_sessions.subject_id
      AND ts.class_id = td_sessions.class_id
  )
);

-- td_sessions UPDATE: owner teacher or school admin
CREATE POLICY "td_sessions_update" ON td_sessions FOR UPDATE TO authenticated
USING (
  private.is_school_admin(school_id)
  OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
);

-- td_sessions DELETE: owner teacher or school admin
CREATE POLICY "td_sessions_delete" ON td_sessions FOR DELETE TO authenticated
USING (
  private.is_school_admin(school_id)
  OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
);

-- td_materials SELECT: admin, teacher (own), student (published session in their class)
CREATE POLICY "td_materials_select" ON td_materials FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM td_sessions WHERE id = td_session_id
    AND (
      private.is_school_admin(school_id)
      OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      OR (
        status = 'published'
        AND class_id IN (SELECT class_id FROM students WHERE user_id = auth.uid())
      )
    )
  )
);

-- td_materials INSERT: teacher owner or admin
CREATE POLICY "td_materials_insert" ON td_materials FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM td_sessions WHERE id = td_session_id
    AND (
      private.is_school_admin(school_id)
      OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
);

-- td_materials DELETE: teacher owner or admin
CREATE POLICY "td_materials_delete" ON td_materials FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM td_sessions WHERE id = td_session_id
    AND (
      private.is_school_admin(school_id)
      OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
);

-- td_attendance SELECT: admin (all), teacher (own sessions), parent (own children only)
CREATE POLICY "td_attendance_select" ON td_attendance FOR SELECT TO authenticated
USING (
  private.is_school_admin((SELECT school_id FROM td_sessions WHERE id = td_session_id))
  OR EXISTS (
    SELECT 1 FROM td_sessions
    WHERE id = td_session_id
      AND teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM student_parents sp
    WHERE sp.student_id = td_attendance.student_id
      AND sp.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
  )
);

-- td_attendance INSERT/UPDATE: ONLY the teacher owner of the session (never the student)
CREATE POLICY "td_attendance_insert" ON td_attendance FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM td_sessions
    WHERE id = td_session_id
      AND teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "td_attendance_update" ON td_attendance FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM td_sessions
    WHERE id = td_session_id
      AND teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "td_attendance_delete" ON td_attendance FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM td_sessions
    WHERE id = td_session_id
      AND teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
);

-- 7. STORAGE BUCKET for td materials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'td-materials',
  'td-materials',
  false,
  10485760,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "td_materials_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'td-materials');

CREATE POLICY "td_materials_download" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'td-materials');

-- 8. MIGRATE EXISTING td/tp FROM ASSIGNMENTS
-- Migrate existing td/tp assignments to td_sessions
INSERT INTO td_sessions (id, school_id, teacher_id, subject_id, class_id, term_id, type, title, session_date, description, status, created_at, updated_at)
SELECT id, school_id, teacher_id, subject_id, class_id, term_id, type, title, due_date, description, status, created_at, updated_at
FROM assignments
WHERE type IN ('td', 'tp')
ON CONFLICT (id) DO NOTHING;

-- Migrate attachments
INSERT INTO td_materials (td_session_id, file_name, file_type, file_size, storage_path, created_at)
SELECT aa.assignment_id, aa.file_name, aa.file_type, aa.file_size, aa.storage_path, aa.created_at
FROM assignment_attachments aa
JOIN assignments a ON a.id = aa.assignment_id
WHERE a.type IN ('td', 'tp')
ON CONFLICT DO NOTHING;

-- 9. Remove td/tp from assignments CHECK constraint
-- First drop old constraint, add new one
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_type_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_type_check CHECK (type IN ('devoir_maison'));

-- 10. Clean up: remove old td/tp assignments (data now in td_sessions)
DELETE FROM assignment_attachments
WHERE assignment_id IN (SELECT id FROM assignments WHERE type = 'td' OR type = 'tp');

DELETE FROM assignment_completions
WHERE assignment_id IN (SELECT id FROM assignments WHERE type = 'td' OR type = 'tp');

DELETE FROM assignments WHERE type IN ('td', 'tp');