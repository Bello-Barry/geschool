-- Fix recursive RLS policies that query public.users from public.users policies.
-- Helper functions run as table owner so policies can resolve the current user's
-- role and school without recursively applying users RLS.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT school_id
  FROM public.users
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION private.can_access_school(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND (
        role = 'super_admin'
        OR school_id = target_school_id
      )
  )
$$;

CREATE OR REPLACE FUNCTION private.is_school_admin(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND (
        role = 'super_admin'
        OR (role = 'admin_school' AND school_id = target_school_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION private.is_parent_of_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_parents sp
    INNER JOIN public.parents p ON p.id = sp.parent_id
    WHERE p.user_id = auth.uid()
      AND sp.student_id = target_student_id
  )
$$;

CREATE OR REPLACE FUNCTION private.is_teacher_for_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_subjects ts
    INNER JOIN public.teachers t ON t.id = ts.teacher_id
    WHERE t.user_id = auth.uid()
      AND ts.class_id = target_class_id
  )
$$;

CREATE OR REPLACE FUNCTION private.can_access_student_parent(target_student_id uuid, target_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    INNER JOIN public.parents p ON p.id = target_parent_id
    WHERE s.id = target_student_id
      AND s.school_id = p.school_id
      AND private.is_school_admin(s.school_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.parents p
    WHERE p.id = target_parent_id
      AND p.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION private.can_modify_student_parent(target_student_id uuid, target_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    INNER JOIN public.parents p ON p.id = target_parent_id
    WHERE s.id = target_student_id
      AND s.school_id = p.school_id
      AND private.is_school_admin(s.school_id)
  )
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

REVOKE ALL ON FUNCTION private.current_user_school_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_school(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_school_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_parent_of_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_teacher_for_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_student_parent(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_modify_student_parent(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.current_user_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_school_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_parent_of_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_teacher_for_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_student_parent(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_modify_student_parent(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "super_admin_all_access" ON schools;
CREATE POLICY "super_admin_all_access" ON schools
FOR ALL TO authenticated
USING (private.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "users_own_school" ON users;
CREATE POLICY "users_own_school" ON users
FOR SELECT TO authenticated
USING (
  private.current_user_role() = 'super_admin'
  OR school_id = private.current_user_school_id()
);

DROP POLICY IF EXISTS "academic_years_view" ON academic_years;
CREATE POLICY "academic_years_view" ON academic_years
FOR SELECT TO authenticated
USING (private.can_access_school(school_id));

DROP POLICY IF EXISTS "academic_years_modify" ON academic_years;
CREATE POLICY "academic_years_modify" ON academic_years
FOR ALL TO authenticated
USING (private.is_school_admin(school_id));

DROP POLICY IF EXISTS "classes_view" ON classes;
CREATE POLICY "classes_view" ON classes
FOR SELECT TO authenticated
USING (private.can_access_school(school_id));

DROP POLICY IF EXISTS "classes_modify" ON classes;
CREATE POLICY "classes_modify" ON classes
FOR ALL TO authenticated
USING (private.is_school_admin(school_id));

DROP POLICY IF EXISTS "subjects_view" ON subjects;
CREATE POLICY "subjects_view" ON subjects
FOR SELECT TO authenticated
USING (private.can_access_school(school_id));

DROP POLICY IF EXISTS "subjects_modify" ON subjects;
CREATE POLICY "subjects_modify" ON subjects
FOR ALL TO authenticated
USING (private.is_school_admin(school_id));

DROP POLICY IF EXISTS "students_view" ON students;
CREATE POLICY "students_view" ON students
FOR SELECT TO authenticated
USING (
  private.can_access_school(school_id)
  AND (
    private.current_user_role() IN ('admin_school', 'super_admin')
    OR private.is_parent_of_student(students.id)
    OR private.is_teacher_for_class(students.class_id)
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "students_modify" ON students;
CREATE POLICY "students_modify" ON students
FOR ALL TO authenticated
USING (private.is_school_admin(school_id));

DROP POLICY IF EXISTS "parents_view" ON parents;
CREATE POLICY "parents_view" ON parents
FOR SELECT TO authenticated
USING (
  private.can_access_school(school_id)
  AND (
    private.current_user_role() IN ('admin_school', 'super_admin')
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "parents_modify" ON parents;
CREATE POLICY "parents_modify" ON parents
FOR ALL TO authenticated
USING (private.is_school_admin(school_id));

DROP POLICY IF EXISTS "teachers_view" ON teachers;
CREATE POLICY "teachers_view" ON teachers
FOR SELECT TO authenticated
USING (
  private.can_access_school(school_id)
  AND (
    private.current_user_role() IN ('admin_school', 'super_admin')
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "teachers_modify" ON teachers;
CREATE POLICY "teachers_modify" ON teachers
FOR ALL TO authenticated
USING (private.is_school_admin(school_id));

DROP POLICY IF EXISTS "teacher_subjects_view" ON teacher_subjects;
CREATE POLICY "teacher_subjects_view" ON teacher_subjects
FOR SELECT TO authenticated
USING (
  private.can_access_school(school_id)
  AND private.current_user_role() IN ('admin_school', 'super_admin', 'teacher')
);

DROP POLICY IF EXISTS "teacher_subjects_modify" ON teacher_subjects;
CREATE POLICY "teacher_subjects_modify" ON teacher_subjects
FOR ALL TO authenticated
USING (private.is_school_admin(school_id));

DROP POLICY IF EXISTS "student_parents_view" ON student_parents;
CREATE POLICY "student_parents_view" ON student_parents
FOR SELECT TO authenticated
USING (private.can_access_student_parent(student_id, parent_id));

DROP POLICY IF EXISTS "student_parents_modify" ON student_parents;
CREATE POLICY "student_parents_modify" ON student_parents
FOR ALL TO authenticated
USING (private.can_modify_student_parent(student_id, parent_id));
