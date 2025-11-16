# ⚡ QUICK START - 30 MINUTES VERS LA PRODUCTION

## 🎯 Objectif
Partir de ZÉRO → Application fonctionnelle en **30 minutes max**

---

## ⏱️ TIMELINE

| Étape | Durée | Action |
|-------|-------|--------|
| 1 | 5 min | Créer Supabase |
| 2 | 10 min | Appliquer migrations |
| 3 | 5 min | Configurer .env.local |
| 4 | 5 min | Tester en local |
| 5 | 5 min | Vérifier OK |

---

## ÉTAPE 1: Créer Projet Supabase (5 min)

### 1.1 Aller à Supabase

Ouvrir: https://supabase.com/dashboard

### 1.2 Créer Nouveau Projet

```
Settings:
  Nom: "geschool-prod"
  Password: [Générer]  ← Copy & Paste elsewhere for safety!
  Region: "eu-west-1" (Frankfurt)
  Plan: "Pro" ($25/mois)
```

Cliquer "Create New Project" → **Attendre 2-3 min**

### 1.3 Copier Les Clés

Une fois créé:
- Aller à **Settings** → **API**
- Copier:
  - `SUPABASE_URL`: `https://xxxx.supabase.co`
  - `SUPABASE_ANON_KEY`: `eyJxx...`
  - `SUPABASE_SERVICE_ROLE_KEY`: `eyJxx...` 🔒

---

## ÉTAPE 2: Appliquer Migrations (10 min)

### 2.1 Ouvrir SQL Editor

Dans Supabase Dashboard:
- Cliquer **SQL Editor** (gauche)
- Cliquer **New Query**

### 2.2 Migration 1: Schema

1. Copier le contenu de: `supabase/migrations/20250101000000_initial_schema.sql`
2. Coller dans SQL Editor
3. Cliquer **Run** ← Attendre ✅ succès

### 2.3 Migration 2: RLS

1. Nouvelle query
2. Copier: `supabase/migrations/20250101000001_rls_policies.sql`
3. **Run** ✅

### 2.4 Migration 3: Functions

1. Nouvelle query
2. Copier: `supabase/migrations/20250101000002_functions.sql`
3. **Run** ✅

### 2.5 Migration 4: Triggers

1. Nouvelle query
2. Copier: `supabase/migrations/20250101000003_triggers.sql`
3. **Run** ✅

### 2.6 Migration 5: Seed Data

1. Nouvelle query
2. Copier: `supabase/migrations/20250101000004_seed_data.sql`
3. **Run** ✅

✅ **Vérifie**: Dans **Table Editor**, tu dois voir 17 tables

---

## ÉTAPE 3: Configurer .env.local (5 min)

### 3.1 Créer fichier

À la racine du projet (`c:\Users\Rebootix\geschool\`):

Créer fichier: `.env.local`

### 3.2 Ajouter Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxx...

# Optionnel (pour MVP1, peut laisser vide)
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-xxxx
NEXT_PUBLIC_GEMINI_API_KEY=AIza...

# Domain
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
```

**Important**: 
- Remplacer `xxxx` par VRAIES clés
- `.env.local` est dans `.gitignore` (secret!) ✅

---

## ÉTAPE 4: Tester en Local (5 min)

### 4.1 Terminal

```bash
cd c:\Users\Rebootix\geschool

# Installer dépendances (si pas déjà fait)
pnpm install

# Lancer l'app
npm run dev
```

### 4.2 Ouvrir dans Navigateur

Aller à: http://localhost:3000

**Vérifier**:
```
✅ Page d'accueil charge
✅ Aucune erreur rouge en console (F12)
✅ Lien "Se connecter" fonctionne
```

### 4.3 Tester Login

1. Aller à http://localhost:3000/login
2. Email: `admin@lycee-sassou.test`
3. Password: `Motdepasse123!`
4. Cliquer "Se connecter"

**Attendu**:
```
✅ Redirect vers /admin dashboard
✅ Voir statistiques (0 élèves peut-être)
✅ Pas d'erreur
```

---

## ÉTAPE 5: Vérifier Status (5 min)

### 5.1 Commandes de Check

```bash
# Vérifier build compile
npm run build

# Vérifier aucune erreur
# Chercher: "✓ Compiled successfully"
```

### 5.2 Points de Vérification

```
✅ npm run dev lance sans erreur
✅ http://localhost:3000 charge
✅ Login possible
✅ Dashboard visible
✅ npm run build succès (0 erreurs TypeScript)
```

---

## 🎉 SUCCÈS!

Si tous les checks passent: **Vous êtes PRÊT pour production!**

### Prochaines étapes (facultatif):

**Option A: Déployer immédiatement**
- Push sur GitHub
- Lier Vercel
- Deploy (voir `DEPLOYMENT_GUIDE.md`)

**Option B: Plus de tests**
- Tests locaux (voir `DEPLOYMENT_GUIDE.md`)
- Ajouter données réelles
- Configurer custom domain

---

## 🆘 ERREURS COMMUN

### ❌ "Cannot find module '@google/generative-ai'"

```bash
pnpm add @google/generative-ai
npm run dev
```

### ❌ "connection refused" (Supabase)

→ Vérifier `NEXT_PUBLIC_SUPABASE_URL` correct dans .env.local

### ❌ "Email not found"

→ Normal! Utilisateurs n'existent que si seed_data s'est exécuté

Créer un nouvel utilisateur via **Register** page

### ❌ Impossible de se connecter

1. Vérifier **Email + Password** corrects
2. Vérifier `.env.local` a vraies clés Supabase
3. Vérifier migrations appliquées (17 tables existent)

---

## 📞 BESOIN D'AIDE?

Consulter dans l'ordre:
1. `DEPLOYMENT_GUIDE.md` → Dépannage section
2. `SUPABASE_SETUP.md` → Configuration détaillée
3. Code comments → Explication technique

---

## ✅ CHECKPOINTS

```
[  ] Supabase projet créé ✅
[  ] 5 migrations appliquées ✅
[  ] .env.local configuré ✅
[  ] npm run dev lancé ✅
[  ] Login page accessible ✅
[  ] Dashboard visible ✅
[  ] npm run build réussit ✅

→ SI TOUS CHECKPOINTS: PRÊT PRODUCTION! 🚀
```

---

**Durée totale**: ~30 min  
**Résultat**: Application fonctionnelle + Prêt déploiement
