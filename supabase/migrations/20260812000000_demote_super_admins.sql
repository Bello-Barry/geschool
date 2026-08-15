-- Migration sécurité : rétrograder tous les comptes super_admin en admin_school.
-- Contexte : la route /api/auth/register créait role='super_admin' au lieu de 'admin_school'.
-- En conséquence, 3165 comptes (dont ~10 réels) disposaient du bypass RLS total
-- (lecture + écriture cross-tenant sur users/students/parents/teachers/classes/subjects/academic_years).
--
-- Décision validée par l'utilisateur (2026-08-12) :
--   - Tous les super_admin existants -> admin_school (aucun n'est légitime)
--   - Recréer 1 compte plateforme dédié : platform@geschool.app (super_admin)
--
-- Note : la mise à jour est exécutée via le service-role (bypass RLS).
-- Le compte platform@geschool.app est rattaché à l'école /demo (school_id NOT NULL requis
-- par le middleware multi-tenant) et son mot de passe est à définir via /set-password
-- ou la console Supabase.

-- 1) Rétrograder tous les super_admin existants
UPDATE public.users
SET role = 'admin_school',
    updated_at = NOW()
WHERE role = 'super_admin';

-- 2) S'assurer que platform@geschool.app a le rôle super_admin (créé par script)
-- (l'insertion est gérée par scripts/fix-super-admins.ts qui crée aussi l'utilisateur auth)
