-- =========================================
-- DONNÉES DE TEST - ÉCOLE DE DÉMONSTRATION
-- =========================================

-- Créer école de test
INSERT INTO schools (name, subdomain, code, primary_color, phone, email, address) VALUES
(
  'Lycée Denis Sassou Nguesso',
  'lycee-sassou',
  'LYCEE-SASSOU-2025',
  '#DC2626',
  '+242 06 123 45 67',
  'contact@lycee-sassou.ecole-congo.com',
  'Bacongo, Brazzaville, Congo'
);

-- Créer année scolaire 2024-2025
INSERT INTO academic_years (school_id, name, start_date, end_date, is_current)
SELECT id, '2024-2025', '2024-09-15'::DATE, '2025-07-15'::DATE, true
FROM schools WHERE subdomain = 'lycee-sassou';

-- Créer trimestres
INSERT INTO terms (academic_year_id, school_id, name, term_number, start_date, end_date, is_current)
SELECT 
  ay.id, 
  ay.school_id,
  term_data.name,
  term_data.number,
  term_data.start_date,
  term_data.end_date,
  term_data.is_current
FROM academic_years ay
CROSS JOIN (VALUES
  ('1er Trimestre', 1, '2024-09-15'::DATE, '2024-12-20'::DATE, true),
  ('2ème Trimestre', 2, '2025-01-06'::DATE, '2025-03-31'::DATE, false),
  ('3ème Trimestre', 3, '2025-04-14'::DATE, '2025-07-15'::DATE, false)
) AS term_data(name, number, start_date, end_date, is_current)
WHERE ay.name = '2024-2025' AND ay.school_id = (SELECT id FROM schools WHERE subdomain = 'lycee-sassou');

-- Créer classes
INSERT INTO classes (school_id, academic_year_id, name, level, capacity, room_number)
SELECT 
  s.id,
  ay.id,
  class_data.name,
  class_data.level,
  class_data.capacity,
  class_data.room
FROM schools s
CROSS JOIN academic_years ay
CROSS JOIN (VALUES 
  ('6ème A', '6ème', 30, 'R101'),
  ('6ème B', '6ème', 30, 'R102'),
  ('5ème A', '5ème', 30, 'R201'),
  ('5ème B', '5ème', 30, 'R202'),
  ('4ème A', '4ème', 30, 'R301'),
  ('4ème B', '4ème', 30, 'R302'),
  ('3ème A', '3ème', 30, 'R401'),
  ('3ème B', '3ème', 30, 'R402')
) AS class_data(name, level, capacity, room)
WHERE s.subdomain = 'lycee-sassou' AND ay.name = '2024-2025';

-- Créer matières
INSERT INTO subjects (school_id, name, code, coefficient, description)
SELECT id, subject_name, subject_code, coef, description
FROM schools
CROSS JOIN (VALUES
  ('Mathématiques', 'MATH', 4, 'Mathématiques générales'),
  ('Français', 'FR', 3, 'Langue française et littérature'),
  ('Physique-Chimie', 'PC', 3, 'Sciences physiques et chimie'),
  ('SVT', 'SVT', 2, 'Sciences de la vie et de la terre'),
  ('Histoire-Géographie', 'HG', 2, 'Histoire et géographie'),
  ('Anglais', 'ANG', 2, 'Langue anglaise'),
  ('EPS', 'EPS', 1, 'Éducation physique et sportive'),
  ('Arts Plastiques', 'ARTS', 1, 'Arts et création')
) AS subjects(subject_name, subject_code, coef, description)
WHERE subdomain = 'lycee-sassou';