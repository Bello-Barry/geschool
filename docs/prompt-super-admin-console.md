# Prompt — Console Super Admin : le point de contrôle global de GESchool

> À transmettre tel quel à l'agent qui implémentera la correction.

---

## Mission

Refondre l'espace **Super Admin** de GESchool pour qu'il devienne la **console de gestion complète de l'entreprise** : le poste de contrôle total de la société GESchool qui gère l'ensemble de ses **écoles partenaires/affiliées**. Il doit être **strictement découplé de toute école** : la console plateforme ne dépend d'aucun contexte scolaire (pas de `school_id`, pas de sous-domaine, pas de branding école). Aujourd'hui ce dashboard est incomplet et, de surcroît, couplé à une école — c'est ce qu'il faut corriger de fond en comble.

## Contexte technique (faits vérifiés dans le code)

- Stack : Next.js 15 App Router (`src/`), Supabase multi-tenant par sous-domaine, shadcn/ui + Tailwind, recharts déjà installé, react-hook-form + zod, tests Vitest/Playwright, `pnpm`.
- La console plateforme vit sous `/super-admin` (sans slug d'école). Layout existant : `src/app/super-admin/layout.tsx` (garde `role === "super_admin"`, rend `DashboardShell` avec `role="super_admin_platform"`, `schoolName="Geschool Admin"`, `schoolSlug=""`).
- Pages existantes : Vue globale (`/super-admin/page.tsx`), Écoles (`schools/page.tsx`, `schools/new/page.tsx`, `schools/[id]/page.tsx`), Utilisateurs (`users/page.tsx`), Revenus (`payments/page.tsx`), Paramètres (`settings/page.tsx`). Composants actions : `src/components/super-admin/school-actions.tsx`, `user-actions.tsx`.
- Navigation par rôle : `src/lib/navigation.ts` (clés `super_admin_platform` et `super_admin`).
- Middleware : **supprimé**. L'ancien `middleware.ts` (racine) n'a jamais été exécuté par Next.js 15 (l'app étant dans `src/`, seul `src/middleware.ts` serait actif — encore aucune). Toute la redirection et l'injection de contexte se font côté pages serveur (`getAuthUser()` dans `src/lib/utils/auth-utils.ts`) et côté client (`login-form.tsx`). Ne pas recréer un middleware sans revue complète de ce qui en dépend implicitement.
- Façon plateforme d'accès aux données : client service-role `@/lib/supabase/admin` (`createAdminClient()`), sans filtre école, comme le font déjà les pages `/super-admin/*`.
- L'unique compte super admin en base est `platform@geschool.app` et sa ligne `users.school_id` est **renseignée** (données actuelles : `8a02c622-…`) → autre source du couplage.
- Base réelle : ~14 écoles, ~79 utilisateurs, RLS active sur toutes les tables, types écrits à la main dans `src/types/database.ts` (mise à jour manuelle obligatoire si le schéma change), migrations SQL dans `supabase/migrations/` (à appliquer ensuite sur la base, et à rejouer dans l'ordre).

## Ce que l'agent doit corriger (problèmes précis, fichier par fichier)

1. **Découpler totalement le compte plateforme de toute école.**
   - Ajouter une migration SQL de nettoyage : `UPDATE users SET school_id = NULL WHERE role = 'super_admin';` (+ éventuelle contrainte : interdire un `school_id` sur un rôle `super_admin`, ex. trigger).
   - Le middleware n'existant plus, il n'y a aucune injection de headers par middleware. Veiller à ce qu'aucun composant/page/API de la console plateforme ne lise `getSchoolFromHeaders()` ni un `school_id` de session (les pages utilisent `getAuthUser()`). Si besoin, fournir un helper `getPlatformHeaders()` explicite largement commenté.

2. **Uniformiser le rôle plateforme.**
   - Dans `src/lib/navigation.ts`, aligner `super_admin` (vue plateforme) sur `super_admin_platform` (Vue Globale, Écoles, Utilisateurs, Revenus, Partenaires/Affiliés, Paramètres), et retirer l'accès direct aux pages d'une école depuis le menu plateforme (la navigation « dans une école » passera par un sélecteur d'école explicite, cf. point 5).

3. **Vue globale / KPIs réels (dashboard).**
   - KPIs exacts au niveau plateforme : écoles totales/actives/suspendues, utilisateurs par rôle, élèves inscrits, revenus totaux + du mois, taux d'onboarding, MRR si pertinent.
   - Ajouter des **séries temporelles** avec recharts (écoles créées par mois, revenus par mois, utilisateurs actifs cumulés).
   - Classements : top revenus par école, écoles « à risque » (0 actif 30 derniers jours, aucun élève, aucun paiement), dernières inscriptions.
   - Afficher les coûts/performance fournisseurs (IA, email) si les données d'appel existent ; sinon l'indiquer comme à brancher.

4. **Écoles = partenaires/affiliés.**
   - Liste Écoles : recherche fonctionnelle (serveur ou client), filtres (statut, période, type d'affiliation), pagination, actions inline fiables (activer/suspendre/supprimer logiquement) via les composants actions existants.
   - Page détail d'une école (`schools/[id]`) : compléter — infos générales, couleur/logo, nombre d'utilisateurs par rôle, élèves/classes, revenus et échéances, statut d'onboarding (étapes franchies), historique des actions, accès « entrer dans l'école ».
   - Page création (`schools/new`) : en faire un **parcours d'onboarding partenaire/affilié** (si l'app le permet) : compte admin de l'école, nom, sous-domaine unique, couleur, et champs offre/affiliation (référence de contrat, statut). Réutiliser les patterns existants (`@/lib/supabase/admin`, formulaire zod + RHF, API route école).

5. **Navigation « impersonation » propre.**
   - Ajouter dans la barre de la console plateforme un **sélecteur d'école** : « Plateforme (global) » par défaut, puis chaque école partenaire pour y entrer sans perdre le contexte plateforme (URL sous `/super-admin/schools/[id]` ou équivalent), jamais comme état par défaut.

6. **Utilisateurs.**
   - Recherche fonctionnelle, filtres (rôle, école, statut), pagination, tri, colonne école en **nom lisible** (jointure `users → schools`) et non un UUID tronqué, actions activer/suspendre/réaffecter.

7. **Revenus / transactions plateforme.**
   - KPIs consolidés (encaissé confirmé, en attente, rejetés, total déclaré), breakdown par école, par méthode de paiement, par période ; historique paginé ; **export CSV**.
   - Réserver un espace pour la future commission/part Geschool par école affiliée (à brancher).

8. **Paramètres plateforme.**
   - État réel (lecture seule) des intégrations : Supabase, Resend, Gemini, DeepSeek, root domain.
   - Ajouter des onglets : « Intégrations », « Sécurité & comptes plateforme » (liste des super admins, création/destruction), « Journal d'audit » (traçabilité des actions super admin), « Facturation GESchool » (factures/relances écoles, à brancher sur l'existant sales-kit si disponible).

9. **Sécurité / garde-fous.**
   - Chaque page ET chaque API route de la console platforme doit vérifier `role === "super_admin"` (même règle que `src/app/super-admin/layout.tsx`) ; toute donnée doit passer par `createAdminClient()` (service-role) et n'avoir **aucun** filtre implicite par école.
   - Ne jamais exposer de clé, de token ou de mail complet sensible dans l'UI.

## Contraintes imposées

- Respecter les conventions existantes : alias `@/*`, `@/components/*`, `@/lib/*` (attention à la duplication `lib/` vs `src/lib/`), types manuels dans `src/types/database.ts`, migrations dans `supabase/migrations/`, client supabase adapté par couche (client/server/admin — plus de middleware), pas de nouveau paquet sauf si indispensable.
- Modifier `src/types/database.ts` si le schéma change. Prévoir la migration SQL associée.
- Ne jamais retirer les rôles `admin_school`, `teacher`, `parent`, `student` ni casser le multi-tenant (chaque école conserve son espace scindé).
- Ne pas commiter de secret ; ne pas toucher au fichier `.env*`.
- Écrire des tests Vitest/Playwright si pertinent (au minimum un test Playwright qui vérifie : connexion super admin → `/super-admin`, aucun header d'école, navigation complète).

## Critères de fin (Definition of Done)

1. `platform@geschool.app` a `school_id = NULL` en base et sa session ne propage aucune valeur d'école.
2. `/super-admin/**` fonctionne sans aucun `x-school-id` et sans dépendre d'un sous-domaine.
3. Toutes les listes (écoles, utilisateurs, paiements) sont recherchables, paginées et filtrables ; les actions (activer/suspendre) fonctionnent réellement.
4. La Vue Globale affiche des KPIs et des graphiques réels, multi-écoles.
5. `pnpm build` passe, les tests existants passent, et un smoke test manuel sur les 4 rôles existants reste OK.
6. Un démo « console plateforme » visible (ex. capture type screenshot tour des 8 écrans) est fourni.

## Étapes de vérification

1. `pnpm dev` puis navigateur : connexion `platform@geschool.app` → redirection `/super-admin`.
2. Vérifier dans l'onglet Réseau de DevTools que les requêtes API de la console plateforme n'ont aucun paramètre `school_id`.
3. Tester recherche/pagination/filtres sur chaque liste.
4. Tester l'entrée dans une école puis le retour à la vue Plateforme.
5. Rejouer les migrations sur l'environnement cible puis relancer `pnpm build`.