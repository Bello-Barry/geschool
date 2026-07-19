CREATE TABLE schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  teacher_subject_id UUID REFERENCES teacher_subjects(id) ON DELETE CASCADE NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedule_slots_school ON schedule_slots(school_id);
CREATE INDEX idx_schedule_slots_class ON schedule_slots(class_id);
CREATE INDEX idx_schedule_slots_teacher_subject ON schedule_slots(teacher_subject_id);
CREATE INDEX idx_schedule_slots_day ON schedule_slots(school_id, day_of_week);

ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_slots_view" ON schedule_slots
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
    EXISTS (
      SELECT 1 FROM student_parents sp
      INNER JOIN parents p ON p.id = sp.parent_id
      INNER JOIN students s ON s.id = sp.student_id
      WHERE p.user_id = auth.uid()
      AND s.class_id = schedule_slots.class_id
    )
    OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid()
      AND s.class_id = schedule_slots.class_id
    )
  )
);

CREATE POLICY "schedule_slots_modify" ON schedule_slots
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin_school', 'super_admin')
    AND school_id = schedule_slots.school_id
  )
);
