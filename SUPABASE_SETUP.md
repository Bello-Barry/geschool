# 🗄️ GUIDE COMPLET SUPABASE - MISE EN PLACE PRODUCTION

## 📋 TABLE DES MATIÈRES

1. [Création du Projet](#1-création-du-projet)
2. [Application des Migrations](#2-application-des-migrations)
3. [Configuration RLS](#3-configuration-rls)
4. [Configuration Auth](#4-configuration-auth)
5. [Données de Test](#5-données-de-test)
6. [Vérification Fonctionnelle](#6-vérification-fonctionnelle)
7. [Optimisations](#7-optimisations)
8. [Sauvegarde & Monitoring](#8-sauvegarde--monitoring)

---

## 1. CRÉATION DU PROJET

### Étape 1: Créer un Compte Supabase

1. Aller à https://supabase.com
2. Cliquer "Start Your Project"
3. Se connecter avec GitHub (recommandé)

### Étape 2: Créer Nouveau Projet

```
Settings:
  Project Name: geschool-prod
  Database Password: [Générer fort - 20+ caractères]
  Region: eu-west-1 (Frankfurt - meilleur pour Afrique)
  Pricing: Pro ($25/mois minimum)
```

### Étape 3: Obtenir les Clés API

Aller à: **Settings** → **API**

```
Copier:
  SUPABASE_URL: https://xxxx.supabase.co
  ANON_KEY: eyJxx...
  SERVICE_ROLE_KEY: eyJxx... (🔒 Secret!)
```

Sauvegarder dans `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxx...
```

---

## 2. APPLICATION DES MIGRATIONS

### Méthode 1: Supabase SQL Editor (Recommandé pour débuter)

**IMPORTANT**: Exécuter DANS L'ORDRE EXACT:

#### Migration 1: Schema Initial (20250101000000)

1. Aller à: **SQL Editor** → **New Query**
2. Copier le contenu de `supabase/migrations/20250101000000_initial_schema.sql`
3. Cliquer **Run**
4. ✅ Vérifier: Tables créées dans "Table Editor"

```bash
# Vérifier création
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

# ✅ Doit afficher 17 tables
```

#### Migration 2: RLS Policies (20250101000001)

1. **SQL Editor** → **New Query**
2. Copier: `supabase/migrations/20250101000001_rls_policies.sql`
3. Cliquer **Run**
4. ✅ Vérifier RLS activé:

```sql
SELECT * FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
-- Doit montrer TOUTES les tables avec rowsecurity=true
```

#### Migration 3: Functions (20250101000002)

1. **SQL Editor** → **New Query**
2. Copier: `supabase/migrations/20250101000002_functions.sql`
3. Cliquer **Run**
4. ✅ Vérifier fonctions créées:

```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- ✅ Doit afficher:
-- calculate_class_rank
-- calculate_general_average
-- calculate_subject_average
-- update_updated_at_column
```

#### Migration 4: Triggers (20250101000003)

1. **SQL Editor** → **New Query**
2. Copier: `supabase/migrations/20250101000003_triggers.sql`
3. Cliquer **Run**
4. ✅ Vérifier triggers:

```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY trigger_name;

-- ✅ Doit afficher 4+ triggers
```

#### Migration 5: Seed Data (20250101000004)

1. **SQL Editor** → **New Query**
2. Copier: `supabase/migrations/20250101000004_seed_data.sql`
3. Cliquer **Run**
4. ✅ Vérifier données:

```sql
SELECT COUNT(*) FROM schools;       -- 1
SELECT COUNT(*) FROM academic_years;-- 1
SELECT COUNT(*) FROM terms;         -- 3
SELECT COUNT(*) FROM classes;       -- 5
SELECT COUNT(*) FROM subjects;      -- 8
```

### Méthode 2: Supabase CLI (Pour dépôt Git)

```bash
# Installer CLI
npm install -g supabase

# Login
supabase login

# Lier au projet
supabase link

# Appliquer migrations
supabase db push

# Vérifier
supabase db lint
```

---

## 3. CONFIGURATION RLS

### Vérifier RLS Activé

```sql
-- SQL Editor → Run
SELECT * FROM pg_tables 
WHERE schemaname = 'public' 
AND table_name NOT LIKE 'pg_%'
AND rowsecurity = false;

-- ✅ Doit retourner 0 lignes (tous RLS activés)
-- ❌ Si résultats: activer RLS manuellement
```

### Si RLS Non Activé

```sql
-- Activer RLS sur CHAQUE table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
-- ... et ainsi de suite pour toutes les 17 tables
```

### Vérifier Les Policies

```sql
-- Voir TOUTES les policies
SELECT * FROM pg_policies 
WHERE schema = 'public' 
ORDER BY schemaname, tablename, policyname;

-- Voir policies d'une table
SELECT * FROM pg_policies 
WHERE tablename = 'students';

-- ✅ Doit afficher 2+ policies par table
```

### Test RLS: Accès Non Autorisé

```sql
-- Se connecter en tant que utilisateur avec rôle 'parent'
-- Essayer de voir élèves d'une autre école
SELECT * FROM students 
WHERE school_id != (
  SELECT school_id FROM users WHERE id = auth.uid()
);

-- ✅ Doit retourner 0 lignes (bloqué par RLS)
```

---

## 4. CONFIGURATION AUTH

### Étape 1: Email Provider

**Auth** → **Providers** → **Email**:
- ✅ Cocher "Enable Email Provider"
- Auto Confirm: `false` (nécessite confirmation email)
- Double confirm change: `true`

### Étape 2: Redirect URLs

**Auth** → **URL Configuration**:

```
Site URL:
  https://ecole-congo.com

Redirect URLs:
  https://ecole-congo.com/auth/callback
  https://*.ecole-congo.com/auth/callback
  https://localhost:3000/auth/callback
  http://localhost:3000
```

### Étape 3: Email Templates

**Auth** → **Email Templates**:

#### Template: Confirm Signup

Personnaliser le template HTML:

```html
<h2>Bienvenue à Geschool!</h2>
<p>Cliquez le lien ci-dessous pour confirmer votre email:</p>
<a href="{{ .ConfirmationURL }}">Confirmer mon email</a>

<p>Lien expire dans 24 heures.</p>

<!-- Logo École -->
<img src="[URL-LOGO]" alt="Logo École">
```

#### Template: Reset Password

```html
<h2>Réinitialisation Mot de Passe</h2>
<p>Cliquez le lien pour créer un nouveau mot de passe:</p>
<a href="{{ .ConfirmationURL }}">Réinitialiser</a>

<p>Lien expire dans 1 heure.</p>
```

#### Template: Change Email Address

```html
<h2>Confirmer Changement Email</h2>
<p>Cliquez pour confirmer votre nouvel email:</p>
<a href="{{ .ConfirmationURL }}">Confirmer</a>
```

### Étape 4: SMTP (Optionnel - Production)

Pour envoyer plus que 100 emails/jour:

**Auth** → **SMTP Provider**:

```
Provider: SendGrid / Resend / etc.
SMTP Host: [fournisseur]
SMTP Port: 587
SMTP User: [key]
SMTP Pass: [password]
```

---

## 5. DONNÉES DE TEST

### Créer Utilisateurs de Test

```sql
-- 1. Créer utilisateur Super Admin
INSERT INTO auth.users (
  id, email, email_confirmed_at, 
  encrypted_password, raw_app_meta_data, 
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'super@congo-ecoles.test',
  NOW(),
  crypt('Motdepasse123!', gen_salt('bf')),
  '{"provider":"email","providers":["email"]}',
  NOW(),
  NOW()
) RETURNING id;
cef7d503-8ffc-477e-93d9-b804a0279e4f
-- 2. Copier l'ID retourné et insérer dans users table
INSERT INTO users (id, school_id, email, role, first_name, last_name)
VALUES (
  '[ID-FROM-ABOVE]',
  '[school-id-from-schools-table]',
  'super@congo-ecoles.test',
  'super_admin',
  'Admin',
  'Super'
);

-- 3. Créer utilisateur Admin École
-- Répéter process avec role = 'admin_school'

-- 4. Créer utilisateur Enseignant
-- Répéter avec role = 'teacher'

-- 5. Créer utilisateur Parent
-- Répéter avec role = 'parent'

-- 6. Créer utilisateur Élève
-- Répéter avec role = 'student'
```

### Charger Données Réalistes (50 Élèves)

```sql
-- Insérer 50 élèves avec noms congolais
WITH RECURSIVE generate_students AS (
  SELECT 
    ROW_NUMBER() OVER () as num,
    ARRAY['Jean', 'Marie', 'Pierre', 'Sophie', 'Denis'] as first_names,
    ARRAY['Dupont', 'Dumas', 'Dubois', 'Martin', 'Bernard'] as last_names
  FROM generate_series(1, 50)
)
INSERT INTO students (
  user_id, school_id, class_id, 
  matricule, date_of_birth, gender
)
SELECT 
  NULL,
  (SELECT id FROM schools LIMIT 1),
  (SELECT id FROM classes LIMIT 1),
  'MAT' || LPAD(num::TEXT, 5, '0'),
  NOW() - INTERVAL '15 years' - INTERVAL (RANDOM() * 365 || ' days'),
  CASE WHEN RANDOM() > 0.5 THEN 'M' ELSE 'F' END
FROM generate_students;
```

### Insérer Notes de Test

```sql
-- Ajouter notes pour les élèves
INSERT INTO grades (
  student_id, subject_id, term_id, 
  school_id, grade_type, score, date
)
SELECT 
  s.id,
  (SELECT id FROM subjects LIMIT 1),
  (SELECT id FROM terms WHERE is_current = true LIMIT 1),
  s.school_id,
  CASE WHEN RANDOM() > 0.6 THEN 'homework' 
       WHEN RANDOM() > 0.3 THEN 'test' 
       ELSE 'exam' END,
  ROUND((RANDOM() * 18 + 2)::NUMERIC, 1),
  NOW()::DATE - INTERVAL (RANDOM() * 30 || ' days')
FROM students s
LIMIT 150;
```

---

## 6. VÉRIFICATION FONCTIONNELLE

### Test 1: Calcul de Moyennes

```sql
-- Tester function: calculate_subject_average
SELECT calculate_subject_average(
  (SELECT id FROM students LIMIT 1)::UUID,
  (SELECT id FROM subjects LIMIT 1)::UUID,
  (SELECT id FROM terms WHERE is_current = true LIMIT 1)::UUID
) AS subject_avg;

-- ✅ Doit retourner: 8.50 (ou autre moyenne)
```

### Test 2: Moyenne Générale

```sql
SELECT calculate_general_average(
  (SELECT id FROM students LIMIT 1)::UUID,
  (SELECT id FROM terms WHERE is_current = true LIMIT 1)::UUID
) AS general_avg;

-- ✅ Doit retourner: 12.25 (ou autre moyenne pondérée)
```

### Test 3: Classement Classe

```sql
SELECT * FROM calculate_class_rank(
  (SELECT id FROM students LIMIT 1)::UUID,
  (SELECT id FROM terms WHERE is_current = true LIMIT 1)::UUID
);

-- ✅ Doit retourner: rank, total_students
-- Ex: rank: 15, total_students: 45
```

### Test 4: RLS - Isolation Données

```sql
-- Se connecter en tant que 'parent'
-- Essayer de voir étudiants:
SELECT id, matricule FROM students;

-- ✅ Doit retourner SEULEMENT enfants de ce parent
-- (RLS filtre automatiquement)
```

### Test 5: Audit Trail (Vérifier Triggers)

```sql
-- Modifier un étudiant
UPDATE students 
SET gender = 'M' 
WHERE id = (SELECT id FROM students LIMIT 1);

-- Vérifier que updated_at a changé
SELECT id, updated_at FROM students 
WHERE id = (SELECT id FROM students LIMIT 1);

-- ✅ updated_at doit être NOW()
```

---

## 7. OPTIMISATIONS

### Créer Indexes Supplémentaires (Performance)

```sql
-- Indexes pour recherche rapide
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_grades_student_subject_term ON grades(student_id, subject_id, term_id);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_classes_school_year ON classes(school_id, academic_year_id);
CREATE INDEX idx_terms_current ON terms(school_id, is_current);

-- Vérifier indexes créés
SELECT * FROM pg_stat_user_indexes;
```

### Paramètres de Base de Données (Optionnel)

```sql
-- Pour plus de 1000 utilisateurs concurrent:
-- Augmenter max_connections
-- (Contacter support Supabase)

-- View: realtime performance
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;
```

### Cache (Optionnel Futur)

```sql
-- Pour MVP2: Ajouter Redis cache
-- (Intégrer avec Upstash ou similaire)
```

---

## 8. SAUVEGARDE & MONITORING

### Sauvegarde Automatique

Supabase sauvegarde automatiquement tous les jours ✅

**Pour restauration manuelle:**

1. **Database** → **Backups**
2. Voir tous les backups disponibles
3. Cliquer "Restore" si besoin

### Monitoring

**Settings** → **Database**:

```
Voir:
- Database size
- Row count par table
- Query performance
- Connection count
```

### Logs (Debugging)

**Logs** → **API Requests**:

```
Voir TOUTES les requêtes API
Filtrer par endpoint, status code
Chercher erreurs RLS, auth, etc.
```

---

## 📋 CHECKLIST FINAL

- [ ] Projet Supabase créé
- [ ] 5 migrations appliquées (dans l'ordre!)
- [ ] RLS activé sur 17 tables
- [ ] 8+ policies créées
- [ ] 4 fonctions PostgreSQL
- [ ] 4 triggers automatiques
- [ ] 5 utilisateurs de test
- [ ] 50+ étudiants test
- [ ] 150+ notes test
- [ ] Tests functions: moyennes calculées ✅
- [ ] RLS isolation: verified ✅
- [ ] Auth templates: personnalisés ✅
- [ ] Redirect URLs: configurées ✅
- [ ] Email provider: activé ✅
- [ ] Backups: automatic ✅
- [ ] Monitoring: enabled ✅

---

## 🆘 DÉPANNAGE SUPABASE

### ❌ "Permission denied for schema public"

**Solution**: Vérifier que vous êtes connecté en tant que `postgres` (role super-admin)

```sql
-- Vérifier le rôle
SELECT session_user, current_user;

-- Si pas `postgres`, il faut:
-- 1. Aller à Supabase Dashboard
-- 2. Settings → Database
-- 3. Réinitialiser `postgres` password
-- 4. Utiliser nouveau mot de passe
```

### ❌ "RLS policy does not allow"

**Solution**: RLS trop restrictif

```sql
-- Vérifier policies pour cette table
SELECT * FROM pg_policies 
WHERE tablename = 'students';

-- Vérifier rule dans la policy:
-- USING(...) clause doit être correct

-- Tester directement:
SELECT auth.uid();  -- Voir mon ID
SELECT school_id FROM users WHERE id = auth.uid();  -- Mon école
```

### ❌ "Function not found"

**Solution**: Migration functions non appliquée

```bash
# Re-copier et exécuter migration 20250101000002_functions.sql
```

### ❌ "Email not confirmed"

**Solution**: Utilisateur n'a pas confirmé email

```sql
-- Confirmer manuellement pour tests
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'test@example.com';
```

---

## ✅ FINAL: PRÊT POUR PRODUCTION

Quand tout est complété:

```bash
# Tester localement
npm run dev

# Visiter http://localhost:3000
# Tester login avec utilisateur de test
# Vérifier données affichées correctement
```

Si tous les tests passent → **READY FOR PRODUCTION** 🚀

Prochaine étape: `DEPLOYMENT_GUIDE.md`
