CREATE TABLE programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  topic TEXT NOT NULL,
  learning_objectives TEXT,
  resources TEXT,
  evaluation_method TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, subject_id, class_id, term_id, week_number)
);

CREATE INDEX idx_programmes_school ON programmes(school_id);
CREATE INDEX idx_programmes_subject ON programmes(subject_id);
CREATE INDEX idx_programmes_class ON programmes(class_id);
CREATE INDEX idx_programmes_term ON programmes(term_id);
CREATE INDEX idx_programmes_school_subject_class_term ON programmes(school_id, subject_id, class_id, term_id);

ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programmes_view" ON programmes
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin_school', 'super_admin', 'teacher')
    )
    OR
    (status = 'published'
      AND (
        EXISTS (
          SELECT 1 FROM student_parents sp
          INNER JOIN parents p ON p.id = sp.parent_id
          INNER JOIN students s ON s.id = sp.student_id
          WHERE p.user_id = auth.uid()
          AND s.class_id = programmes.class_id
        )
        OR
        EXISTS (
          SELECT 1 FROM students s
          WHERE s.user_id = auth.uid()
          AND s.class_id = programmes.class_id
        )
      )
    )
  )
);

CREATE POLICY "programmes_modify" ON programmes
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin_school', 'super_admin')
    AND school_id = programmes.school_id
  )
  OR
  EXISTS (
    SELECT 1 FROM users u
    INNER JOIN teachers t ON t.user_id = u.id
    WHERE u.id = auth.uid()
    AND u.school_id = programmes.school_id
    AND programmes.created_by = t.id
  )
);
