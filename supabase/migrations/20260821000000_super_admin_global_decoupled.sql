-- Découplage définitif du compte plateforme de toute école.
-- (Complète la migration 20260817000000 en rendant l'indépendance OBLIGATOIRE.)
--
-- Objectif : la console /super-admin est la racine de GESchool ; aucun super_admin
-- ne doit être rattaché à une école (pas de school_id, pas de sous-domaine, pas de branding).

-- 1) Garantir la donnée : aucun super_admin ne porte de school_id.
UPDATE public.users
SET school_id = NULL, updated_at = NOW()
WHERE role = 'super_admin' AND school_id IS NOT NULL;

-- 2) Renforcer l'intégrité : un super_admin DOIT avoir school_id NULL.
--    (Remplace la contrainte permissive de 20260817000000 qui autorisait school_id sur super_admin.)
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_school_id_requires_school_for_role;

ALTER TABLE public.users
  ADD CONSTRAINT users_super_admin_must_be_global
  CHECK (role <> 'super_admin' OR school_id IS NULL);
