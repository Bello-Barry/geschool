# Guide de Test pour l'Application de Gestion Scolaire

Bonjour,

Ce document vous guidera, étape par étape, pour configurer et tester les fonctionnalités principales de votre application en environnement local.

## Synthèse de l'Analyse

Avant de commencer, voici un résumé de mes conclusions après avoir analysé l'ensemble du projet :

*   **Qualité du code :** Le code source est d'excellente qualité, bien structuré et sécurisé. Il correspond presque parfaitement à la documentation très détaillée qui a été fournie.
*   **Architecture :** L'architecture multi-tenant avec les sous-domaines et l'isolation des données via Row Level Security (RLS) est implémentée de manière robuste.
*   **Base de données :** Le schéma de la base de données, les fonctions de calcul et les triggers sont très bien conçus et conformes aux spécifications.
*   **Incohérence majeure :** Le seul point de divergence important est **l'absence totale de tests automatisés** (fichiers de test Vitest ou Playwright). La documentation affirmait leur présence, mais ils n'existent pas dans le code.

**Conclusion :** L'application est fonctionnellement prête à être testée manuellement. Le socle technique est très solide.

---

## Partie 1 : Configuration Initiale (À faire une seule fois)

### Étape 1 : Créer un projet Supabase

1.  Rendez-vous sur [supabase.com](https://supabase.com) et créez un nouveau projet.
2.  Une fois le projet créé, allez dans **Settings -> API**.
3.  Gardez cette page ouverte, vous aurez besoin des informations suivantes :
    *   `Project URL` (votre URL Supabase)
    *   `Project API Keys` -> `anon` `public` (la clé publique)
    *   `Project API Keys` -> `service_role` `secret` (la clé secrète)

### Étape 2 : Configurer les variables d'environnement

1.  À la racine de votre projet, créez un fichier nommé `.env.local`.
2.  Copiez et collez le contenu suivant dans ce fichier :

```env
# Remplacez les valeurs ci-dessous par les vôtres
NEXT_PUBLIC_SUPABASE_URL=VOTRE_URL_SUPABASE
NEXT_PUBLIC_SUPABASE_ANON_KEY=VOTRE_CLE_ANON_PUBLIC
SUPABASE_SERVICE_ROLE_KEY=VOTRE_CLE_SERVICE_ROLE_SECRET

# Vous pouvez laisser ces valeurs vides pour le moment
NEXT_PUBLIC_DEEPSEEK_API_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=

# Pour le développement local
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
```

3.  **Important :** Remplacez `VOTRE_URL_SUPABASE`, `VOTRE_CLE_ANON_PUBLIC`, et `VOTRE_CLE_SERVICE_ROLE_SECRET` par les vraies valeurs de votre projet Supabase.

### Étape 3 : Appliquer les migrations SQL

Vous devez maintenant créer la structure de votre base de données en exécutant les scripts SQL fournis.

1.  Dans votre projet Supabase, allez dans **SQL Editor**.
2.  Cliquez sur **New Query**.
3.  Ouvrez les fichiers dans le dossier `supabase/migrations/` de votre projet.
4.  Copiez et exécutez le contenu de **chaque fichier**, un par un, dans **l'ordre exact** ci-dessous :
    1.  `20250101000000_initial_schema.sql`
    2.  `20250101000001_rls_policies.sql`
    3.  `20250101000002_functions.sql`
    4.  `20250101000003_triggers.sql`
    5.  `20250101000004_seed_data.sql`

À la fin, vous devriez voir les tables (`schools`, `students`, etc.) dans le **Table Editor**.

### Étape 4 : Créer un utilisateur Administrateur de test

Le dernier script a créé une école de test ("Lycée Denis Sassou Nguesso"), mais pas d'utilisateur. Nous allons en créer un.

1.  Dans le **SQL Editor** de Supabase, créez une **New Query**.
2.  Copiez et collez l'intégralité du script ci-dessous, puis cliquez sur **Run**.

```sql
-- Crée un utilisateur dans le système d'authentification de Supabase
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data)
VALUES (
  'admin@lycee-sassou.test',
  -- Ceci est le mot de passe 'Motdepasse123!' haché de manière sécurisée
  crypt('Motdepasse123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'
);

-- Lie cet utilisateur à votre table "users" avec le rôle "admin_school"
INSERT INTO public.users (id, school_id, email, role, first_name, last_name)
VALUES (
  -- Récupère l'ID de l'utilisateur que nous venons de créer
  (SELECT id FROM auth.users WHERE email = 'admin@lycee-sassou.test'),
  -- Récupère l'ID de l'école "Lycée Sassou"
  (SELECT id FROM public.schools WHERE subdomain = 'lycee-sassou'),
  'admin@lycee-sassou.test',
  'admin_school',
  'Admin',
  'Sassou'
);
```

Votre environnement est maintenant prêt !

---

## Partie 2 : Lancement de l'Application

1.  Ouvrez un terminal à la racine de votre projet.
2.  Si vous ne l'avez jamais fait, installez les dépendances avec la commande : `pnpm install`
3.  Lancez l'application avec la commande : `pnpm dev`
4.  Ouvrez votre navigateur et allez à l'adresse [http://localhost:3000](http://localhost:3000).

---

## Partie 3 : Scénario de Test - Administrateur d'École

### Étape 1 : Accéder à l'école via son sous-domaine

1.  Ouvrez votre navigateur et allez directement sur le sous-domaine de l'école de test : **http://lycee-sassou.localhost:3000**
2.  Vous devriez voir l'interface de connexion.

*(Note : Pour que cela fonctionne, vous devrez peut-être modifier votre fichier hosts. Une méthode plus simple est décrite ci-dessous si celle-ci ne fonctionne pas).*

### Étape 2 : Se connecter en tant qu'administrateur

1.  Sur la page de connexion, utilisez les identifiants de l'utilisateur que nous avons créé :
    *   **Email :** `admin@lycee-sassou.test`
    *   **Mot de passe :** `Motdepasse123!`
2.  Cliquez sur "Se connecter".
3.  Vous devriez être redirigé vers le tableau de bord de l'administrateur.

### Étape 3 : Créer un nouvel élève

1.  Dans le menu de gauche, naviguez vers la section de gestion des élèves.
2.  Cliquez sur le bouton pour créer un nouvel élève.
3.  Remplissez le formulaire avec des informations de test (par exemple) :
    *   **Matricule :** `2025-001`
    *   **Prénom :** `Marie`
    *   **Nom :** `Dubois`
    *   **Email :** `marie.dubois@test.com`
    *   **Classe :** `6ème A`
4.  Cliquez sur "Créer l'élève".

### Étape 4 : Vérifier la création

1.  Après la création, vous devriez voir une notification de succès.
2.  L'élève "Marie Dubois" devrait maintenant apparaître dans la liste des élèves de l'école.

---

Félicitations ! Vous avez complété le scénario de test principal. Vous pouvez continuer à explorer les autres fonctionnalités de l'interface d'administration, comme la gestion des classes ou des enseignants. Pour tester les autres rôles (enseignant, parent), il vous suffira de créer de nouveaux utilisateurs avec les rôles correspondants en adaptant le script SQL de l'étape 4.
