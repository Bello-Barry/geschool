-- =========================================
-- TRIGGERS AUTOMATIQUES
-- =========================================

-- Trigger : Mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger : Une seule année scolaire "current" par école
CREATE OR REPLACE FUNCTION ensure_single_current_academic_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE academic_years 
    SET is_current = false 
    WHERE school_id = NEW.school_id 
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_current_academic_year 
BEFORE INSERT OR UPDATE ON academic_years
FOR EACH ROW EXECUTE FUNCTION ensure_single_current_academic_year();

-- Trigger : Une seul trimestre "current" par école
CREATE OR REPLACE FUNCTION ensure_single_current_term()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE terms 
    SET is_current = false 
    WHERE school_id = NEW.school_id 
      AND academic_year_id = NEW.academic_year_id
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_current_term 
BEFORE INSERT OR UPDATE ON terms
FOR EACH ROW EXECUTE FUNCTION ensure_single_current_term();

-- Trigger : Vérifier que le matricule est unique par école
CREATE OR REPLACE FUNCTION check_unique_matricule()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM students s
  INNER JOIN classes c ON c.id = s.class_id
  WHERE s.matricule = NEW.matricule
  AND s.school_id = NEW.school_id
  AND s.id != NEW.id;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Matricule déjà utilisé pour cette école';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unique_matricule_trigger
BEFORE INSERT OR UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION check_unique_matricule();