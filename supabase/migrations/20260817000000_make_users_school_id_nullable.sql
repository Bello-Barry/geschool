-- Phase 3 : rendre `users.school_id` nullable pour les comptes plateforme (super_admin).
-- Objectif : un super_admin est indépendant de toute école (console racine /super-admin),
-- il ne doit plus être rattaché à une école fictive (ex. /demo) par contrainte NOT NULL.
--
-- Option A validée (2026-08-17) : school_id nullable, mais uniquement pour `super_admin`.
-- Les autres rôles (admin_school, teacher, parent, student) conservent l'obligation d'une école.

BEGIN;

-- 1) Lever la contrainte NOT NULL sur school_id
ALTER TABLE public.users ALTER COLUMN school_id DROP NOT NULL;

-- 2) Contrainte CHECK d'intégrité : seuls les super_admin peuvent avoir school_id NULL
ALTER TABLE public.users
  ADD CONSTRAINT users_school_id_requires_school_for_role
  CHECK (role = 'super_admin' OR school_id IS NOT NULL);

-- 3) Détacher le compte plateforme de l'école Démo (school_id -> NULL)
UPDATE public.users
SET school_id = NULL,
    updated_at = NOW()
WHERE email = 'platform@geschool.app'
  AND role = 'super_admin';

-- Nota : le trigger `on_user_updated_sync_jwt` (20260814000000_jwt_custom_claims.sql)
-- synchronise déjà school_id NULL vers auth.users.raw_app_meta_data
-- (CASE WHEN NEW.school_id IS NOT NULL THEN to_jsonb(NEW.school_id) ELSE 'null'::jsonb END),
-- donc le middleware ne résoudra plus d'école pour ce compte.

COMMIT;