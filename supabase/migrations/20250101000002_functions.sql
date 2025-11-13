-- =========================================
-- FONCTIONS POSTGRESQL - CALCULS ACADÉMIQUES
-- =========================================

-- Fonction : Calculer moyenne d'une matière pour un trimestre (Système Congolais)
CREATE OR REPLACE FUNCTION calculate_subject_average(
  p_student_id UUID,
  p_subject_id UUID,
  p_term_id UUID
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_homework_avg DECIMAL(5,2);
  v_test_avg DECIMAL(5,2);
  v_exam_score DECIMAL(5,2);
  v_subject_avg DECIMAL(5,2);
BEGIN
  -- Moyenne des devoirs (40%)
  SELECT COALESCE(AVG(score), 0) INTO v_homework_avg
  FROM grades
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id
    AND grade_type = 'homework';
  
  -- Moyenne des interrogations (30%)
  SELECT COALESCE(AVG(score), 0) INTO v_test_avg
  FROM grades
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id
    AND grade_type = 'test';
  
  -- Note de composition - dernière saisie (30%)
  SELECT COALESCE(score, 0) INTO v_exam_score
  FROM grades
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id
    AND grade_type = 'exam'
  ORDER BY date DESC
  LIMIT 1;
  
  -- Calcul : (Devoirs×2 + Interro×1.5 + Compo×1.5) / 5
  -- Simplifié : (Devoirs + Interro + Compo×2) / 4 (comme demandé)
  v_subject_avg := (
    COALESCE(v_homework_avg, 0) + 
    COALESCE(v_test_avg, 0) + 
    (COALESCE(v_exam_score, 0) * 2)
  ) / 4.0;
  
  RETURN ROUND(v_subject_avg, 2);
END;
$$ LANGUAGE plpgsql;

-- Fonction : Calculer moyenne générale élève (avec coefficients)
CREATE OR REPLACE FUNCTION calculate_general_average(
  p_student_id UUID,
  p_term_id UUID
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_total_weighted DECIMAL(10,2) := 0;
  v_total_coefficients INTEGER := 0;
  v_general_avg DECIMAL(5,2);
  r RECORD;
BEGIN
  FOR r IN 
    SELECT 
      s.id AS subject_id,
      s.coefficient,
      calculate_subject_average(p_student_id, s.id, p_term_id) AS subject_avg
    FROM subjects s
    INNER JOIN grades g ON g.subject_id = s.id
    WHERE g.student_id = p_student_id
      AND g.term_id = p_term_id
      AND s.school_id = (SELECT school_id FROM students WHERE id = p_student_id)
    GROUP BY s.id, s.coefficient
  LOOP
    v_total_weighted := v_total_weighted + (r.subject_avg * r.coefficient);
    v_total_coefficients := v_total_coefficients + r.coefficient;
  END LOOP;
  
  IF v_total_coefficients > 0 THEN
    v_general_avg := v_total_weighted / v_total_coefficients;
  ELSE
    v_general_avg := 0;
  END IF;
  
  RETURN ROUND(v_general_avg, 2);
END;
$$ LANGUAGE plpgsql;

-- Fonction : Calculer classement dans la classe
CREATE OR REPLACE FUNCTION calculate_class_rank(
  p_student_id UUID,
  p_term_id UUID
) RETURNS TABLE(rank INTEGER, total_students INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH student_averages AS (
    SELECT 
      s.id,
      calculate_general_average(s.id, p_term_id) AS avg
    FROM students s
    WHERE s.class_id = (SELECT class_id FROM students WHERE id = p_student_id)
      AND s.school_id = (SELECT school_id FROM students WHERE id = p_student_id)
  ),
  ranked_students AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY avg DESC) AS rnk
    FROM student_averages
  )
  SELECT 
    rs.rnk::INTEGER,
    COUNT(*)::INTEGER AS total
  FROM ranked_students rs
  WHERE rs.id = p_student_id
  GROUP BY rs.rnk;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Vérifier si un élève passe en classe supérieure
CREATE OR REPLACE FUNCTION check_promotion_status(
  p_student_id UUID,
  p_term_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_general_avg DECIMAL(5,2);
BEGIN
  v_general_avg := calculate_general_average(p_student_id, p_term_id);
  
  IF v_general_avg >= 10.0 THEN
    RETURN 'Passable';
  ELSIF v_general_avg >= 12.0 THEN
    RETURN 'Assez Bien';
  ELSIF v_general_avg >= 14.0 THEN
    RETURN 'Bien';
  ELSIF v_general_avg >= 16.0 THEN
    RETURN 'Très Bien';
  ELSE
    RETURN 'Échec';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Générer matricule automatique
CREATE OR REPLACE FUNCTION generate_matricule(
  p_school_id UUID,
  p_academic_year_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_school_code TEXT;
  v_year TEXT;
  v_count INTEGER;
  v_matricule TEXT;
BEGIN
  SELECT code INTO v_school_code FROM schools WHERE id = p_school_id;
  SELECT EXTRACT(YEAR FROM start_date)::TEXT INTO v_year FROM academic_years WHERE id = p_academic_year_id;
  
  SELECT COUNT(*) INTO v_count 
  FROM students s
  INNER JOIN classes c ON c.id = s.class_id
  WHERE c.academic_year_id = p_academic_year_id
  AND s.school_id = p_school_id;
  
  v_matricule := v_school_code || '-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
  RETURN v_matricule;
END;
$$ LANGUAGE plpgsql;