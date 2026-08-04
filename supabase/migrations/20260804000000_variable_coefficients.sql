-- =========================================
-- COEFFICIENTS VARIABLES PAR (MATIÈRE, CLASSE)
-- =========================================
-- Le coefficient d'une matière devient spécifique à la paire (matière, classe),
-- porté par teacher_subjects.coefficient. Si NULL, repli sur subjects.coefficient.

-- 1. Colonne coefficient sur teacher_subjects (nullable, repli sur la matière)
ALTER TABLE teacher_subjects ADD COLUMN IF NOT EXISTS coefficient INTEGER;
ALTER TABLE teacher_subjects DROP CONSTRAINT IF EXISTS teacher_subjects_coefficient_check;
ALTER TABLE teacher_subjects ADD CONSTRAINT teacher_subjects_coefficient_check
  CHECK (coefficient IS NULL OR coefficient > 0);

-- 2. Fonction : coefficient réel d'une matière pour un élève
--    (via teacher_subjects sur sa classe, sinon subjects.coefficient, sinon 1)
CREATE OR REPLACE FUNCTION get_subject_coefficient(
  p_student_id UUID,
  p_subject_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_school_id UUID;
  v_class_id UUID;
  v_coefficient INTEGER;
BEGIN
  SELECT school_id, class_id INTO v_school_id, v_class_id
  FROM students WHERE id = p_student_id;

  IF v_school_id IS NULL THEN
    RETURN 1;
  END IF;

  SELECT COALESCE(
    (SELECT MAX(ts.coefficient) FROM teacher_subjects ts
      WHERE ts.subject_id = p_subject_id
        AND ts.class_id = v_class_id
        AND ts.school_id = v_school_id),
    s.coefficient,
    1
  ) INTO v_coefficient
  FROM subjects s
  WHERE s.id = p_subject_id
    AND s.school_id = v_school_id;

  IF v_coefficient IS NULL THEN
    v_coefficient := 1;
  END IF;

  RETURN v_coefficient;
END;
$$ LANGUAGE plpgsql;

-- 3. Moyenne générale : pondération avec le coefficient (matière, classe)
CREATE OR REPLACE FUNCTION calculate_general_average(
  p_student_id UUID,
  p_term_id UUID
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_total_weighted DECIMAL(10,2) := 0;
  v_total_coefficients INTEGER := 0;
  v_general_avg DECIMAL(5,2);
  v_coefficient INTEGER;
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      s.id AS subject_id,
      calculate_subject_average(p_student_id, s.id, p_term_id) AS subject_avg
    FROM subjects s
    INNER JOIN grades g ON g.subject_id = s.id
    WHERE g.student_id = p_student_id
      AND g.term_id = p_term_id
      AND s.school_id = (SELECT school_id FROM students WHERE id = p_student_id)
    GROUP BY s.id
  LOOP
    v_coefficient := get_subject_coefficient(p_student_id, r.subject_id);
    v_total_weighted := v_total_weighted + (r.subject_avg * v_coefficient);
    v_total_coefficients := v_total_coefficients + v_coefficient;
  END LOOP;

  IF v_total_coefficients > 0 THEN
    v_general_avg := v_total_weighted / v_total_coefficients;
  ELSE
    v_general_avg := 0;
  END IF;

  RETURN ROUND(v_general_avg, 2);
END;
$$ LANGUAGE plpgsql;
