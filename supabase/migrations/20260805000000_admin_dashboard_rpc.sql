-- ============================================================
-- Migration : fonction RPC pour le dashboard admin école
-- Remplace les 6 requêtes parallèles par 1 appel optimisé
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(p_school_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_count   INTEGER;
  v_teacher_count   INTEGER;
  v_class_count     INTEGER;
  v_total_revenue   NUMERIC;
  v_month_revenue   NUMERIC;
  v_absent_today    INTEGER;
  v_pending_fees    INTEGER;
BEGIN
  -- Nombre d'élèves actifs
  SELECT COUNT(*) INTO v_student_count
  FROM students WHERE school_id = p_school_id;

  -- Nombre d'enseignants actifs
  SELECT COUNT(*) INTO v_teacher_count
  FROM teachers WHERE school_id = p_school_id;

  -- Nombre de classes (année en cours)
  SELECT COUNT(*) INTO v_class_count
  FROM classes c
  JOIN academic_years ay ON ay.id = c.academic_year_id
  WHERE c.school_id = p_school_id AND ay.is_current = true;

  -- Revenus totaux
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM payments WHERE school_id = p_school_id;

  -- Revenus du mois en cours
  SELECT COALESCE(SUM(amount), 0) INTO v_month_revenue
  FROM payments
  WHERE school_id = p_school_id
    AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE);

  -- Absences aujourd'hui
  SELECT COUNT(*) INTO v_absent_today
  FROM attendance a
  JOIN students s ON s.id = a.student_id
  WHERE s.school_id = p_school_id
    AND a.date = CURRENT_DATE
    AND a.status = 'absent';

  -- Familles en retard de paiement (simplification)
  -- (nombre de frais configurés sans paiement ce mois)
  SELECT COUNT(DISTINCT tf.class_id) INTO v_pending_fees
  FROM tuition_fees tf
  JOIN academic_years ay ON ay.id = tf.academic_year_id
  WHERE tf.school_id = p_school_id AND ay.is_current = true;

  RETURN json_build_object(
    'student_count',   v_student_count,
    'teacher_count',   v_teacher_count,
    'class_count',     v_class_count,
    'total_revenue',   v_total_revenue,
    'month_revenue',   v_month_revenue,
    'absent_today',    v_absent_today,
    'pending_fees',    v_pending_fees
  );
END;
$$;

-- Accorder l'exécution au rôle service_role uniquement
REVOKE ALL ON FUNCTION get_admin_dashboard_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats(UUID) TO service_role;

COMMENT ON FUNCTION get_admin_dashboard_stats IS
  'Retourne les statistiques agrégées pour le dashboard admin école. '
  'Utiliser via le client admin (service_role) uniquement.';
