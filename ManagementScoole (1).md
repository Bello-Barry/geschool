# PROMPT PROFESSIONNEL - APPLICATION DE GESTION SCOLAIRE MULTI-TENANT CONGO-BRAZZAVILLE

## CONTEXTE ET OBJECTIF

Tu es un architecte logiciel senior expert en applications SaaS éducatives. Tu dois générer **UNE APPLICATION COMPLÈTE ET PRÊTE POUR LA PRODUCTION** de gestion scolaire multi-tenant destinée au marché du Congo-Brazzaville.

L'application permettra à plusieurs écoles différentes d'utiliser la même plateforme avec une isolation totale des données. Chaque école aura son propre sous-domaine personnalisé (ex: `lycee-sassou.ecole-congo.com`).

---

## STACK TECHNIQUE IMPOSÉE

### Frontend
- Next.js 15 (App Router, Server Components, TypeScript strict mode)
- TailwindCSS + Shadcn/ui (tous les composants nécessaires)
- Lucide React (icônes uniquement)
- React Hook Form + Zod (validation formulaires)
- React-Toastify (notifications)
- Zustand (state management global)
- Recharts (graphiques statistiques)
- @react-pdf/renderer (génération bulletins PDF)
- date-fns (manipulation dates)

### Backend & Infrastructure
- Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- Row Level Security (RLS) strict pour isolation multi-tenant
- Vercel (déploiement et hébergement)

### Intelligence Artificielle
- DeepSeek API (analyse académique, génération commentaires bulletins, détection élèves à risque)
- Gemini API (chatbot parents multilingue français/Lingala)
- Model Context Protocol (MCP) avec serveurs custom TypeScript

### Qualité & Tests
- ESLint + Prettier (linting et formatting)
- Vitest (tests unitaires et intégration)
- Playwright (tests E2E)
- TypeScript strict mode (zéro `any` autorisé)

---

## ARCHITECTURE MULTI-TENANT - SYSTÈME EMAIL INTELLIGENT

### Principe Fondamental

**Architecture à sous-domaines avec détection automatique d'école** :

1. **URL principale** : `https://ecole-congo.com` (page d'accueil publique)
2. **Sous-domaines par école** : `https://lycee-sassou.ecole-congo.com`, `https://college-mabou.ecole-congo.com`
3. **Détection intelligente** : L'utilisateur entre uniquement son email → le système détecte automatiquement son école → redirection vers le sous-domaine correspondant

### Flux Utilisateur Complet

**Étape 1 : Invitation**
- Le directeur invite un parent via l'interface admin
- Le parent reçoit un SMS/Email/WhatsApp avec lien direct contenant son email pré-rempli

**Étape 2 : Détection Automatique**
- L'utilisateur clique sur le lien ou va sur `ecole-congo.com`
- Il entre son email dans un formulaire simple
- API `/api/detect-school` cherche l'utilisateur dans la base et retourne le sous-domaine de son école

**Étape 3 : Redirection Personnalisée**
- Redirection automatique vers `https://lycee-sassou.ecole-congo.com/login?email=...`
- Interface de login personnalisée avec logo et couleurs de l'école

**Étape 4 : Authentification & Vérification**
- Login via Supabase Auth
- Vérification que l'utilisateur appartient bien à l'école du sous-domaine
- Redirection vers le dashboard approprié selon le rôle (admin/teacher/parent/student)

### Middleware Next.js Critical

Le middleware DOIT :
1. Extraire le sous-domaine de l'URL entrante
2. Vérifier si le sous-domaine correspond à une école active dans Supabase
3. Injecter `school_id` dans les headers de requête pour utilisation dans les Server Components
4. Rediriger vers page d'erreur si sous-domaine invalide
5. Gérer les sous-domaines réservés (www, api, admin, cdn, static)
6. Protéger les routes authentifiées et rediriger vers login si nécessaire

### Row Level Security (RLS)

**CRITIQUE** : Toutes les tables doivent avoir :
- Une colonne `school_id` (sauf table `schools` elle-même)
- Des policies RLS qui filtrent automatiquement par le `school_id` de l'utilisateur connecté
- Isolation totale : un utilisateur ne peut JAMAIS voir les données d'une autre école

---

## SCHÉMA BASE DE DONNÉES SUPABASE COMPLET

### Instructions pour la Génération SQL

Génère **TOUTES** les migrations SQL nécessaires avec :
Tables Core Multi-Tenant
-- 1. SCHOOLS (tenant principal)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  phone TEXT,
  email TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS (tous les utilisateurs de toutes les écoles)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin_school', 'teacher', 'parent', 'student')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ACADEMIC YEARS (années scolaires)
CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  name TEXT NOT NULL, -- "2024-2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TERMS (trimestres)
CREATE TABLE terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  name TEXT NOT NULL, -- "1er Trimestre"
  term_number INTEGER NOT NULL CHECK (term_number IN (1, 2, 3)),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLASSES (6ème A, 3ème B...)
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  academic_year_id UUID REFERENCES academic_years(id) NOT NULL,
  name TEXT NOT NULL, -- "6ème A"
  level TEXT NOT NULL, -- "6ème", "3ème", "Terminale"
  capacity INTEGER,
  room_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUBJECTS (matières)
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  name TEXT NOT NULL, -- "Mathématiques"
  code TEXT, -- "MATH"
  coefficient INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. STUDENTS (élèves)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  class_id UUID REFERENCES classes(id),
  matricule TEXT UNIQUE NOT NULL,
  date_of_birth DATE,
  place_of_birth TEXT,
  gender TEXT CHECK (gender IN ('M', 'F')),
  blood_group TEXT,
  allergies TEXT,
  medical_notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PARENTS (tuteurs légaux)
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  relationship TEXT, -- "Père", "Mère", "Tuteur"
  profession TEXT,
  workplace TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. STUDENT_PARENTS (relation many-to-many)
CREATE TABLE student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, parent_id)
);

-- 10. TEACHERS (enseignants)
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  specialization TEXT,
  hire_date DATE,
  employee_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TEACHER_SUBJECTS (enseignant → matières → classes)
CREATE TABLE teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- 12. GRADES (notes)
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  grade_type TEXT NOT NULL CHECK (grade_type IN ('homework', 'test', 'exam')),
  score DECIMAL(5,2), -- Note sur 20
  max_score DECIMAL(5,2) DEFAULT 20,
  date DATE NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ATTENDANCE (présences)
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  school_id UUID REFERENCES schools(id) NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- 14. PAYMENTS (paiements scolarité)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  academic_year_id UUID REFERENCES academic_years(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'mobile_money', 'bank_transfer', 'check')),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TUITION_FEES (frais de scolarité par classe)
CREATE TABLE tuition_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  class_id UUID REFERENCES classes(id),
  academic_year_id UUID REFERENCES academic_years(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. REPORT_CARDS (bulletins générés)
CREATE TABLE report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ,
  general_average DECIMAL(5,2),
  class_rank INTEGER,
  total_students INTEGER,
  teacher_comment TEXT,
  director_comment TEXT,
  ai_generated_comment TEXT,
  status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
Indexes pour Performance
-- Indexes critiques
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_term_id ON grades(term_id);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_schools_subdomain ON schools(subdomain);
CREATE INDEX idx_academic_years_school_current ON academic_years(school_id, is_current);
CREATE INDEX idx_terms_school_current ON terms(school_id, is_current);
Fonctions PostgreSQL - Calculs Moyennes (Système Congolais)
-- Fonction : Calculer moyenne d'une matière pour un trimestre
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
  -- Moyenne des devoirs
  SELECT AVG(score) INTO v_homework_avg
  FROM grades
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id
    AND grade_type = 'homework';
  
  -- Moyenne des interrogations
  SELECT AVG(score) INTO v_test_avg
  FROM grades
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id
    AND grade_type = 'test';
  
  -- Note de composition (dernière saisie)
  SELECT score INTO v_exam_score
  FROM grades
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id
    AND grade_type = 'exam'
  ORDER BY date DESC
  LIMIT 1;
  
  -- Calcul : (Devoirs + Interro + Compo×2) / 4
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
Triggers Automatiques
-- Trigger : Mettre à jour updated_at automatiquement
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

-- Trigger : Vérifier qu'une seule année scolaire est "current" par école
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
Row Level Security (RLS) - CRITIQUE
-- Activer RLS sur TOUTES les tables
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

-- POLICIES GLOBALES : Les users voient uniquement leur école

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

-- STUDENTS : Parents voient leurs enfants, enseignants leurs classes
CREATE POLICY "students_visibility" ON students
FOR SELECT TO authenticated
USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  AND (
    -- Admin école voit tous les élèves de son école
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

-- GRADES : Enseignants modifient leurs matières, parents/élèves lisent
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

-- PAYMENTS : Admin et parents concernés
CREATE POLICY "payments_visibility" ON payments
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
    EXISTS (
      SELECT 1 FROM student_parents sp
      INNER JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
      AND sp.student_id = payments.student_id
    )
  )
);

-- Répéter ce pattern pour toutes les autres tables...
-- (academic_years, terms, classes, subjects, attendance, etc.)
Seed Data (Données de Test)
-- Créer une école de test
INSERT INTO schools (name, subdomain, code, primary_color) VALUES
('Lycée Denis Sassou Nguesso', 'lycee-sassou', 'LYCEE-SASSOU-2025', '#DC2626');

-- Créer année scolaire 2024-2025
INSERT INTO academic_years (school_id, name, start_date, end_date, is_current)
SELECT id, '2024-2025', '2024-09-15', '2025-07-15', true
FROM schools WHERE subdomain = 'lycee-sassou';

-- Créer 3 trimestres
INSERT INTO terms (academic_year_id, school_id, name, term_number, start_date, end_date, is_current)
SELECT 
  ay.id, 
  ay.school_id,
  '1er Trimestre',
  1,
  '2024-09-15',
  '2024-12-20',
  true
FROM academic_years ay
WHERE ay.name = '2024-2025' AND ay.school_id = (SELECT id FROM schools WHERE subdomain = 'lycee-sassou');

-- Créer des classes
INSERT INTO classes (school_id, academic_year_id, name, level, capacity)
SELECT 
  s.id,
  ay.id,
  class_name,
  class_level,
  30
FROM schools s
CROSS JOIN academic_years ay
CROSS JOIN (VALUES 
  ('6ème A', '6ème'),
  ('6ème B', '6ème'),
  ('5ème A', '5ème'),
  ('4ème A', '4ème'),
  ('3ème A', '3ème')
) AS classes(class_name, class_level)
WHERE s.subdomain = 'lycee-sassou' AND ay.name = '2024-2025';

-- Créer des matières
INSERT INTO subjects (school_id, name, code, coefficient)
SELECT id, subject_name, subject_code, coef
FROM schools
CROSS JOIN (VALUES
  ('Mathématiques', 'MATH', 4),
  ('Français', 'FR', 3),
  ('Physique-Chimie', 'PC', 3),
  ('SVT', 'SVT', 2),
  ('Histoire-Géographie', 'HG', 2),
  ('Anglais', 'ANG', 2),
  ('EPS', 'EPS', 1),
  ('Arts Plastiques', 'ARTS', 1)
) AS subjects(subject_name, subject_code, coef)
WHERE subdomain = 'lycee-sassou';

-- TODO: Ajouter 50 élèves avec noms congolais réalistes
-- TODO: Ajouter 10 enseignants
-- TODO: Ajouter 30 parents
-- TODO: Ajouter notes pour le 1er


## STRUCTURE PROJET NEXT.JS 15 COMPLÈTE

### Arborescence Détaillée

Génère cette structure EXACTE avec TOUS les fichiers nécessaires :

```
school-management-congo/
├── .github/
│   └── workflows/
│       └── deploy.yml                # CI/CD GitHub Actions
├── app/
│   ├── (public)/                     # Routes publiques (sans auth)
│   │   ├── page.tsx                  # Page d'accueil avec détection email
│   │   ├── about/
│   │   ├── pricing/
│   │   ├── contact/
│   │   └── school-not-found/
│   ├── (auth)/                       # Routes authentification
│   │   ├── login/
│   │   │   └── page.tsx              # Login sur sous-domaine école
│   │   ├── register/
│   │   ├── reset-password/
│   │   ├── verify-email/
│   │   └── set-password/             # Premier login (mot de passe temporaire)
│   ├── (dashboard)/                  # Routes protégées
│   │   ├── layout.tsx                # Layout avec sidebar + header
│   │   ├── admin/                    # Interface Admin École (Directeur)
│   │   │   ├── page.tsx              # Dashboard : stats, graphiques
│   │   │   ├── school/               # Paramètres école
│   │   │   │   └── page.tsx          # Logo, couleurs, infos
│   │   │   ├── academic-years/       # Gestion années scolaires
│   │   │   │   ├── page.tsx          # Liste années
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx      # Détails + trimestres
│   │   │   │   │   └── edit/
│   │   │   │   └── new/
│   │   │   ├── classes/              # Gestion classes
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx      # Liste élèves de la classe
│   │   │   │   │   ├── edit/
│   │   │   │   │   └── students/     # Ajouter élèves à la classe
│   │   │   │   └── new/
│   │   │   ├── students/             # Gestion élèves
│   │   │   │   ├── page.tsx          # Liste + recherche + filtres
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx      # Profil élève complet
│   │   │   │   │   ├── edit/
│   │   │   │   │   └── grades/       # Historique notes
│   │   │   │   ├── new/
│   │   │   │   └── import/           # Import CSV/Excel
│   │   │   ├── teachers/             # Gestion enseignants
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── edit/
│   │   │   │   └── new/
│   │   │   ├── parents/              # Gestion parents
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   └── new/
│   │   │   ├── subjects/             # Gestion matières
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/edit/
│   │   │   │   └── new/
│   │   │   ├── assignments/          # Attribution enseignants
│   │   │   │   └── page.tsx          # Teacher → Subject → Class
│   │   │   ├── payments/             # Gestion financière
│   │   │   │   ├── page.tsx          # Dashboard financier
│   │   │   │   ├── transactions/
│   │   │   │   ├── arrears/          # Élèves en retard
│   │   │   │   ├── fees/             # Configuration frais
│   │   │   │   └── reports/          # Rapports financiers
│   │   │   ├── reports/              # Rapports & Analytics
│   │   │   │   ├── page.tsx
│   │   │   │   ├── academic/         # Performance académique
│   │   │   │   ├── financial/        # Rapports financiers
│   │   │   │   ├── attendance/       # Assiduité
│   │   │   │   └── custom/           # Rapports personnalisés
│   │   │   ├── bulk-reports/         # Génération masse bulletins
│   │   │   │   └── page.tsx
│   │   │   ├── notifications/        # Centre notifications
│   │   │   │   └── page.tsx
│   │   │   └── settings/             # Paramètres système
│   │   │       ├── page.tsx
│   │   │       ├── users/            # Gestion utilisateurs
│   │   │       ├── roles/
│   │   │       └── security/
│   │   ├── teacher/                  # Interface Enseignant
│   │   │   ├── page.tsx              # Dashboard enseignant
│   │   │   ├── classes/              # Mes classes
│   │   │   │   ├── page.tsx
│   │   │   │   └── [classId]/
│   │   │   │       ├── page.tsx      # Détails classe
│   │   │   │       └── students/
│   │   │   ├── grades/               # Saisie notes
│   │   │   │   ├── page.tsx
│   │   │   │   └── [classId]/
│   │   │   │       └── [subjectId]/
│   │   │   │           └── page.tsx  # Tableau saisie notes
│   │   │   ├── attendance/           # Présences
│   │   │   │   ├── page.tsx
│   │   │   │   └── [classId]/
│   │   │   ├── schedule/             # Mon emploi du temps
│   │   │   │   └── page.tsx
│   │   │   └── messages/             # Communication parents
│   │   │       └── page.tsx
│   │   ├── parent/                   # Interface Parent
│   │   │   ├── page.tsx              # Dashboard parent
│   │   │   ├── children/             # Mes enfants
│   │   │   │   ├── page.tsx          # Liste enfants
│   │   │   │   └── [studentId]/
│   │   │   │       ├── page.tsx      # Profil enfant
│   │   │   │       ├── grades/       # Consultation notes
│   │   │   │       ├── attendance/   # Présences
│   │   │   │       └── reports/      # Bulletins téléchargeables
│   │   │   ├── payments/             # Mes paiements
│   │   │   │   ├── page.tsx
│   │   │   │   └── history/
│   │   │   ├── messages/             # Communication école
│   │   │   │   └── page.tsx
│   │   │   └── chatbot/              # Assistant IA
│   │   │       └── page.tsx
│   │   └── student/                  # Interface Élève (optionnel MVP)
│   │       ├── page.tsx
│   │       ├── grades/
│   │       ├── schedule/
│   │       └── resources/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── session/route.ts
│   │   ├── detect-school/
│   │   │   └── route.ts              # Détection école depuis email
│   │   ├── schools/
│   │   │   ├── route.ts              # CRUD écoles (super_admin)
│   │   │   └── [id]/route.ts
│   │   ├── students/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── import/route.ts       # Import CSV
│   │   ├── grades/
│   │   │   ├── route.ts
│   │   │   ├── calculate/route.ts    # Calcul moyennes
│   │   │   └── bulk-update/route.ts
│   │   ├── reports/
│   │   │   ├── generate/route.ts     # Génération bulletins PDF
│   │   │   └── send/route.ts         # Envoi WhatsApp/Email
│   │   ├── payments/
│   │   │   ├── route.ts
│   │   │   └── mobile-money/         # Intégration Mobile Money
│   │   │       └── webhook/route.ts
│   │   ├── ai/
│   │   │   ├── analyze-grades/
│   │   │   │   └── route.ts          # Analyse IA via DeepSeek
│   │   │   ├── generate-comments/
│   │   │   │   └── route.ts          # Commentaires bulletins
│   │   │   ├── chatbot/
│   │   │   │   └── route.ts          # Chatbot Gemini
│   │   │   └── assistant/
│   │   │       └── route.ts          # Assistant directeur
│   │   ├── mcp/                      # Model Context Protocol
│   │   │   ├── tools/
│   │   │   │   ├── calculate-average/route.ts
│   │   │   │   ├── get-student-info/route.ts
│   │   │   │   └── send-notification/route.ts
│   │   │   └── server/route.ts
│   │   ├── notifications/
│   │   │   ├── send-sms/route.ts
│   │   │   ├── send-email/route.ts
│   │   │   └── send-whatsapp/route.ts
│   │   └── webhooks/
│   │       ├── supabase/route.ts
│   │       └── payment/route.ts
│   ├── globals.css
│   ├── layout.tsx                    # Root layout
│   └── error.tsx
├── components/
│   ├── ui/                           # Shadcn components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── calendar.tsx
│   │   ├── form.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   └── ... (tous les composants Shadcn nécessaires)
│   ├── dashboard/
│   │   ├── header.tsx                # Header avec notifications
│   │   ├── sidebar.tsx               # Sidebar navigation
│   │   ├── stats-card.tsx            # Cartes statistiques
│   │   ├── recent-activity.tsx
│   │   └── user-dropdown.tsx
│   ├── forms/
│   │   ├── student-form.tsx          # Formulaire élève complet
│   │   ├── teacher-form.tsx
│   │   ├── parent-form.tsx
│   │   ├── class-form.tsx
│   │   ├── subject-form.tsx
│   │   ├── grade-form.tsx
│   │   ├── payment-form.tsx
│   │   └── bulk-grade-input.tsx      # Saisie masse notes
│   ├── tables/
│   │   ├── students-table.tsx        # Table élèves avec filtres
│   │   ├── teachers-table.tsx
│   │   ├── grades-table.tsx
│   │   ├── payments-table.tsx
│   │   └── data-table.tsx            # Table générique réutilisable
│   ├── charts/
│   │   ├── grades-chart.tsx          # Graphique évolution notes
│   │   ├── attendance-chart.tsx
│   │   ├── revenue-chart.tsx
│   │   └── class-performance-chart.tsx
│   ├── pdf/
│   │   ├── report-card-template.tsx  # Template bulletin PDF
│   │   ├── payment-receipt.tsx
│   │   └── student-list.tsx
│   ├── ai/
│   │   ├── chatbot-widget.tsx        # Widget chatbot Gemini
│   │   ├── ai-suggestions.tsx        # Suggestions IA
│   │   └── comment-generator.tsx
│   ├── modals/
│   │   ├── confirm-dialog.tsx
│   │   ├── student-details-modal.tsx
│   │   └── grade-history-modal.tsx
│   ├── layout/
│   │   ├── public-navbar.tsx         # Navbar site public
│   │   ├── footer.tsx
│   │   └── loading-spinner.tsx
│   └── providers/
│       ├── theme-provider.tsx
│       ├── toast-provider.tsx
│       └── auth-provider.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Client Supabase (browser)
│   │   ├── server.ts                 # Server Supabase (SSR)
│   │   ├── middleware.ts             # Middleware auth
│   │   └── admin.ts                  # Admin client (bypass RLS)
│   ├── ai/
│   │   ├── deepseek.ts               # Client DeepSeek
│   │   ├── gemini.ts                 # Client Gemini
│   │   ├── prompts/
│   │   │   ├── comment-generation.ts
│   │   │   ├── analysis.ts
│   │   │   └── chatbot.ts
│   │   └── cache.ts                  # Cache réponses IA
│   ├── mcp/
│   │   ├── server.ts                 # Serveur MCP principal
│   │   ├── client.ts                 # Client MCP
│   │   ├── tools/
│   │   │   ├── academic-tools.ts     # Outils calculs académiques
│   │   │   ├── database-tools.ts     # Outils accès DB
│   │   │   └── communication-tools.ts
│   │   └── schemas/
│   │       └── tool-schemas.ts       # Schémas Zod pour outils
│   ├── utils/
│   │   ├── calculations.ts           # Calculs moyennes
│   │   ├── validators.ts             # Validations Zod
│   │   ├── formatters.ts             # Formattage dates, montants
│   │   ├── pdf-generator.ts          # Génération PDF
│   │   ├── excel-parser.ts           # Parser Excel/CSV
│   │   ├── error-handler.ts
│   │   └── constants.ts
│   ├── notifications/
│   │   ├── sms.ts                    # Service SMS (Twilio)
│   │   ├── email.ts                  # Service Email (Resend)
│   │   ├── whatsapp.ts               # Service WhatsApp
│   │   └── templates/
│   │       ├── email-templates.tsx
│   │       └── sms-templates.ts
│   ├── payments/
│   │   ├── mobile-money.ts           # Intégration Mobile Money
│   │   └── payment-processor.ts
│   ├── store/                        # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── school-store.ts           # Store école courante
│   │   ├── ui-store.ts
│   │   └── notification-store.ts
│   └── hooks/
│       ├── use-school.ts             # Hook école courante
│       ├── use-current-user.ts
│       ├── use-academic-year.ts
│       ├── use-debounce.ts
│       └── use-media-query.ts
├── supabase/
│   ├── migrations/
│   │   ├── 20250101000000_initial_schema.sql
│   │   ├── 20250101000001_rls_policies.sql
│   │   ├── 20250101000002_functions.sql
│   │   ├── 20250101000003_triggers.sql
│   │   └── 20250101000004_seed_data.sql
│   ├── functions/                    # Edge Functions
│   │   ├── send-report-card/
│   │   │   └── index.ts
│   │   └── process-payment/
│   │       └── index.ts
│   ├── seed.sql                      # Données de test
│   └── config.toml
├── types/
│   ├── database.ts                   # Types auto-générés Supabase
│   ├── index.ts                      # Types custom
│   ├── api.ts
│   └── forms.ts
├── scripts/
│   ├── seed.ts                       # Script seed data
│   ├── create-school.ts              # CLI création école
│   ├── import-students.ts            # Import CSV élèves
│   ├── generate-reports.ts           # Génération masse bulletins
│   └── admin.ts                      # CLI admin général
├── public/
│   ├── images/
│   ├── logos/
│   └── fonts/
├── __tests__/
│   ├── unit/
│   │   ├── calculations.test.ts
│   │   ├── validators.test.ts
│   │   └── formatters.test.ts
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── grades.test.ts
│   │   └── reports.test.ts
│   └── e2e/
│       ├── admin-flow.spec.ts
│       ├── teacher-flow.spec.ts
│       └── parent-flow.spec.ts
├── .env.example
├── .env.local
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── postcss.config.js
├── components.json                   # Shadcn config
├── middleware.ts                     # Middleware Next.js principal
├── vitest.config.ts
├── playwright.config.ts
└── README.md

### Instructions pour Chaque Fichier

Pour CHAQUE fichier de l'arborescence ci-dessus, tu dois générer :

#### Pages Next.js (app/...)
- **Utiliser Server Components par défaut**, Client Components uniquement si nécessaire (interactivité)
- **Récupérer school_id depuis headers** dans Server Components : `const headersList = headers(); const schoolId = headersList.get('x-school-id');`
- **Fetcher les données avec Supabase Server Client** pour profiter du SSR
- **Gérer les états loading** avec Suspense et loading.tsx
- **Gérer les erreurs** avec error.tsx
- **Validation de rôle** : vérifier que l'utilisateur a le bon rôle pour accéder à la page

#### API Routes (app/api/...)
- **Valider tous les inputs avec Zod**
- **Créer Supabase client avec cookies** : `createRouteHandlerClient({ cookies })`
- **Vérifier authentification** : récupérer session et vérifier qu'elle existe
- **Vérifier school_id** : s'assurer que l'utilisateur appartient bien à l'école concernée
- **Gestion d'erreurs robuste** avec try/catch et codes HTTP appropriés
- **Rate limiting** sur endpoints sensibles (notamment IA)

#### Composants UI (components/...)
- **Tous les composants Shadcn nécessaires** : button, input, card, table, dialog, dropdown-menu, select, textarea, avatar, badge, calendar, form, tabs, tooltip, alert, skeleton
- **Composants métier réutilisables** : StudentForm (avec validation Zod), GradesTable (avec saisie inline), StatsCard (avec graphique trend), etc.
- **Design responsive mobile-first** : utilisable sur mobile (priorité Congo)
- **États loading et erreurs** gérés dans chaque composant
- **TypeScript strict** : typage complet des props

#### Librairies IA (lib/ai/...)
- **deepseek.ts** : fonction `callDeepSeek()` générique, `generateBulletinComment()`, `analyzeSchoolPerformance()`, `detectAtRiskStudents()`
- **gemini.ts** : fonction `chatbotResponse()` avec contexte élève, `translateToLingala()`
- **Cache des réponses** pour éviter appels API redondants
- **Gestion des erreurs gracieuse** avec fallbacks

#### Serveurs MCP (lib/mcp/...)
- **server.ts** : Serveur MCP avec 4+ outils minimum :
  1. `calculate_student_average` : calcule moyenne élève
  2. `get_class_ranking` : classement classe
  3. `check_promotion_status` : vérifier si élève passe
  4. `send_notification` : envoyer notification
- **Schémas Zod** pour validation des inputs outils
- **Accès Supabase avec service role key** (bypass RLS pour les outils)

#### Middleware (middleware.ts)
C'est le fichier le PLUS CRITIQUE :
1. Extraire hostname et sous-domaine
2. Gérer sous-domaines réservés (www, api, admin)
3. Si sous-domaine école : vérifier qu'elle existe et est active dans Supabase
4. Injecter dans headers : `x-school-id`, `x-school-name`, `x-school-logo`, `x-school-color`
5. Vérifier authentification pour routes protégées
6. Rediriger vers login si non authentifié
7. Rediriger vers dashboard approprié si déjà connecté sur page auth

---

## FONCTIONNALITÉS DÉTAILLÉES PAR INTERFACE

### Interface Admin École (Directeur/Secrétariat)

#### Dashboard Principal
- **Cartes statistiques** : Nombre élèves, enseignants, classes, revenus du mois (avec trends)
- **Graphique revenus mensuels** : Recharts LineChart avec données des 12 derniers mois
- **Graphique performance par classe** : BarChart avec moyennes générales
- **Alertes IA** : Carte rouge affichant élèves en difficulté (moyenne < 10) avec recommandations DeepSeek
- **Activité récente** : Derniers paiements, inscriptions, absences

#### Gestion Élèves
- **Liste complète** avec table triable/filtrable (DataTable)
- **Recherche multi-critères** : nom, matricule, classe, statut
- **Fiche élève détaillée** : infos personnelles, photo, parents, historique notes, présences, paiements
- **Import CSV/Excel** : parser le fichier, valider les données, créer users auth + students en masse
- **Export Excel** : liste élèves avec toutes infos

#### Gestion Notes
- **Vue par classe et matière**
- **Visualisation des moyennes** calculées en temps réel
- **Historique complet** sur plusieurs trimestres
- **Détection anomalies** (notes absentes, écarts importants)

#### Gestion Financière
- **Dashboard financier** : revenus vs prévisions, taux de recouvrement
- **Saisie paiements** : formulaire avec élève, montant, mode paiement, reçu auto-généré en PDF
- **Suivi arriérés** : liste élèves en retard avec montants dus, bouton envoi relance SMS
- **Configuration frais** : définir frais de scolarité par classe et année
- **Rapports** : export Excel pour comptabilité

#### Génération Bulletins
- **Génération individuelle** : bulletin PDF téléchargeable
- **Génération masse** : sélectionner classe/trimestre, générer tous les bulletins, envoi auto par WhatsApp/Email
- **Commentaires IA** : bouton "Générer commentaires IA" qui utilise DeepSeek pour tous les élèves
- **Prévisualisation** avant envoi

### Interface Enseignant

#### Dashboard
- **Mes classes** : cartes avec nombre élèves, moyenne classe
- **Emploi du temps** : calendrier hebdomadaire
- **Tâches à faire** : notes à saisir, absences à justifier

#### Saisie Notes
- **Tableau classe-matière** : une ligne par élève, colonnes pour devoirs, interro, compo
- **Saisie inline** avec validation (0-20)
- **Calcul moyenne automatique** en temps réel pendant la saisie
- **Sauvegarde auto** ou bouton save par ligne
- **Historique modifications** pour audit

#### Gestion Présences
- **Calendrier mensuel** avec vue par jour
- **Saisie rapide** : cocher présent/absent/retard pour toute la classe
- **Justifications** : parents peuvent justifier absences, enseignant valide

### Interface Parent

#### Dashboard
- **Cartes enfants** : si plusieurs enfants, une carte par enfant avec photo, classe, dernière moyenne
- **Alertes** : notifications importantes (absence, note faible, paiement dû)
- **Raccourcis** : voir notes, payer scolarité, contacter école

#### Consultation Notes
- **Bulletin interactif** : graphiques d'évolution par matière
- **Comparaison** : moyenne enfant vs moyenne classe
- **Détail par trimestre** avec téléchargement PDF
- **Commentaires enseignants** visibles

#### Paiements
- **Historique complet** : tous les paiements avec reçus PDF
- **Solde restant** : montant dû avec échéances
- **Bouton paiement** : (MVP : enregistrement manuel, Phase 2 : intégration Mobile Money)

#### Chatbot IA
- **Widget flottant** en bas à droite
- **Questions fréquentes** : "Quelle est la moyenne de mon enfant ?", "Combien dois-je payer ?"
- **Contexte complet** : chatbot a accès aux données élève via MCP
- **Multilingue** : détection auto français/Lingala ou switch manuel

---

## INTÉGRATIONS IA - SPÉCIFICATIONS DÉTAILLÉES

### DeepSeek API

#### 1. Génération Commentaires Bulletins
**Fonction** : `generateBulletinComment(studentData)`

**Input** :
```typescript
{
  name: string,
  average: number,
  subjectAverages: Array<{ subject: string, average: number, coefficient: number }>,
  attendance: { present: number, absent: number, late: number },
  previousAverage?: number
}
```

**Prompt système** :
- Tu es un directeur d'école expérimenté au Congo-Brazzaville
- Génère un commentaire constructif et encourageant 50-100 mots
- Mentionne points forts et axes d'amélioration
- Ton formel et bienveillant
- En français

