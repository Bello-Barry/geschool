-- =========================================
-- ROW LEVEL SECURITY - POLICIES
-- =========================================

-- Activer RLS sur toutes les tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =========================================
-- POLICIES GLOBALES
-- =========================================

-- SUPER_ADMIN voit tout
CREATE POLICY "super_admin_all_access" ON schools
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- USERS : Voir uniquement son école
CREATE POLICY "users_own_school" ON users
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "users_update_own" ON users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ACADEMIC YEARS
CREATE POLICY "academic_years_view" ON academic_years
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "academic_years_modify" ON academic_years
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = academic_years.school_id
  )
);

-- TERMS
CREATE POLICY "terms_view" ON terms
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "terms_modify" ON terms
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = terms.school_id
  )
);

-- CLASSES
CREATE POLICY "classes_view" ON classes
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "classes_modify" ON classes
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = classes.school_id
  )
);

-- SUBJECTS
CREATE POLICY "subjects_view" ON subjects
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "subjects_modify" ON subjects
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = subjects.school_id
  )
);

-- STUDENTS
CREATE POLICY "students_view" ON students
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    -- Admin école voit tous les élèves
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin')
    )
    OR
    -- Parents voient leurs enfants
    EXISTS (
      SELECT 1 FROM student_parents sp
      INNER JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
      AND sp.student_id = students.id
    )
    OR
    -- Enseignants voient les élèves de leurs classes
    EXISTS (
      SELECT 1 FROM teacher_subjects ts
      INNER JOIN teachers t ON t.id = ts.teacher_id
      WHERE t.user_id = auth.uid()
      AND ts.class_id = students.class_id
    )
    OR
    -- L'élève voit son propre profil
    user_id = auth.uid()
  )
);

CREATE POLICY "students_modify" ON students
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = students.school_id
  )
);

-- PARENTS
CREATE POLICY "parents_view" ON parents
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin')
    )
    OR
    -- Un parent voit son propre profil
    user_id = auth.uid()
  )
);

CREATE POLICY "parents_modify" ON parents
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = parents.school_id
  )
);

-- TEACHERS
CREATE POLICY "teachers_view" ON teachers
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin')
    )
    OR
    -- Un enseignant voit son propre profil
    user_id = auth.uid()
  )
);

CREATE POLICY "teachers_modify" ON teachers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = teachers.school_id
  )
);

-- TEACHER_SUBJECTS
CREATE POLICY "teacher_subjects_view" ON teacher_subjects
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin', 'teacher')
    )
  )
);

CREATE POLICY "teacher_subjects_modify" ON teacher_subjects
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = teacher_subjects.school_id
  )
);

-- GRADES
CREATE POLICY "grades_read" ON grades
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    -- Admin école
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin')
    )
    OR
    -- Parents de l'élève
    EXISTS (
      SELECT 1 FROM student_parents sp
      INNER JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
      AND sp.student_id = grades.student_id
    )
    OR
    -- Enseignant de la matière
    EXISTS (
      SELECT 1 FROM teacher_subjects ts
      INNER JOIN teachers t ON t.id = ts.teacher_id
      WHERE t.user_id = auth.uid()
      AND ts.subject_id = grades.subject_id
    )
    OR
    -- L'élève voit ses notes
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = grades.student_id
      AND s.user_id = auth.uid()
    )
  )
);

CREATE POLICY "grades_insert_update" ON grades
FOR ALL TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    -- Admin école
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin')
    )
    OR
    -- Enseignant de la matière
    EXISTS (
      SELECT 1 FROM teacher_subjects ts
      INNER JOIN teachers t ON t.id = ts.teacher_id
      WHERE t.user_id = auth.uid()
      AND ts.subject_id = grades.subject_id
    )
  )
);

-- ATTENDANCE
CREATE POLICY "attendance_view" ON attendance
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin')
    )
    OR
    -- Parents voient les absences de leurs enfants
    EXISTS (
      SELECT 1 FROM student_parents sp
      INNER JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
      AND sp.student_id = attendance.student_id
    )
    OR
    -- Enseignants de la classe
    EXISTS (
      SELECT 1 FROM teacher_subjects ts
      INNER JOIN teachers t ON t.id = ts.teacher_id
      WHERE t.user_id = auth.uid()
      AND ts.class_id = attendance.class_id
    )
  )
);

CREATE POLICY "attendance_modify" ON attendance
FOR ALL TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin')
    )
    OR
    -- Enseignant de la classe peut modifier
    EXISTS (
      SELECT 1 FROM teacher_subjects ts
      INNER JOIN teachers t ON t.id = ts.teacher_id
      WHERE t.user_id = auth.uid()
      AND ts.class_id = attendance.class_id
    )
  )
);

-- PAYMENTS
CREATE POLICY "payments_view" ON payments
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin')
    )
    OR
    -- Parents voient les paiements de leurs enfants
    EXISTS (
      SELECT 1 FROM student_parents sp
      INNER JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
      AND sp.student_id = payments.student_id
    )
  )
);

CREATE POLICY "payments_modify" ON payments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  )
);

-- TUITION_FEES
CREATE POLICY "tuition_fees_view" ON tuition_fees
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "tuition_fees_modify" ON tuition_fees
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = tuition_fees.school_id
  )
);

-- REPORT_CARDS
CREATE POLICY "report_cards_view" ON report_cards
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin_school', 'super_admin')
    )
    OR
    -- Parents voient les bulletins de leurs enfants
    EXISTS (
      SELECT 1 FROM student_parents sp
      INNER JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
      AND sp.student_id = report_cards.student_id
    )
    OR
    -- L'élève voit son bulletin
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = report_cards.student_id
      AND s.user_id = auth.uid()
    )
  )
);

CREATE POLICY "report_cards_modify" ON report_cards
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  )
);

-- NOTIFICATIONS
CREATE POLICY "notifications_view" ON notifications
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "notifications_modify" ON notifications
FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = notifications.school_id
  )
);

-- STUDENT_PARENTS
CREATE POLICY "student_parents_view" ON student_parents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  )
  OR
  -- Parents voient leurs relations
  EXISTS (
    SELECT 1 FROM parents p
    WHERE p.user_id = auth.uid()
    AND p.id = student_parents.parent_id
  )
);

CREATE POLICY "student_parents_modify" ON student_parents
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin_school', 'super_admin')
    AND school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  )
);