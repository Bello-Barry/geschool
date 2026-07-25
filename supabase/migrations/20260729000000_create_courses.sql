-- Migration: Create courses and course_attachments tables
-- Dependencies: schools, teachers, subjects, classes, terms, programmes

-- 1. COURSES TABLE
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  teacher_id UUID REFERENCES teachers(id) NOT NULL,
  subject_id UUID REFERENCES subjects(id) NOT NULL,
  class_id UUID REFERENCES classes(id) NOT NULL,
  term_id UUID REFERENCES terms(id),
  programme_entry_id UUID REFERENCES programmes(id),
  title TEXT NOT NULL,
  key_points TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search vector (generated column for GIN index)
ALTER TABLE courses ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('french', coalesce(title, '') || ' ' || coalesce(key_points, ''))) STORED;

-- 2. COURSE ATTACHMENTS
CREATE TABLE course_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX idx_courses_class ON courses(class_id, status);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_subject ON courses(subject_id);
CREATE INDEX idx_courses_search ON courses USING GIN (search_vector);
CREATE INDEX idx_course_attachments_course ON course_attachments(course_id);

-- 4. UPDATED_AT TRIGGER
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. ROW LEVEL SECURITY
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_attachments ENABLE ROW LEVEL SECURITY;

-- courses SELECT
CREATE POLICY "courses_select" ON courses FOR SELECT TO authenticated
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
        AND s.class_id = courses.class_id
    )
  )
);

-- courses INSERT: teacher must be assigned to this subject+class via teacher_subjects
CREATE POLICY "courses_insert" ON courses FOR INSERT TO authenticated
WITH CHECK (
  private.is_school_admin(school_id)
  OR
  EXISTS (
    SELECT 1 FROM teacher_subjects ts
    WHERE ts.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      AND ts.subject_id = courses.subject_id
      AND ts.class_id = courses.class_id
  )
);

-- courses UPDATE: owner teacher or school admin
CREATE POLICY "courses_update" ON courses FOR UPDATE TO authenticated
USING (
  private.is_school_admin(school_id)
  OR
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
);

-- courses DELETE: owner teacher or school admin
CREATE POLICY "courses_delete" ON courses FOR DELETE TO authenticated
USING (
  private.is_school_admin(school_id)
  OR
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
);

-- course_attachments SELECT: follows course visibility
CREATE POLICY "course_attachments_select" ON course_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses WHERE id = course_id
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
            AND s.class_id = courses.class_id
        )
      )
    )
  )
);

-- course_attachments INSERT: course owner or admin
CREATE POLICY "course_attachments_insert" ON course_attachments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses WHERE id = course_id
    AND (
      private.is_school_admin(school_id)
      OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
);

-- course_attachments DELETE: course owner or admin
CREATE POLICY "course_attachments_delete" ON course_attachments FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses WHERE id = course_id
    AND (
      private.is_school_admin(school_id)
      OR teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
);

-- 6. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-attachments',
  'course-attachments',
  false,
  10485760,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "course_attachments_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-attachments');

CREATE POLICY "course_attachments_download" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'course-attachments');
