-- Création de la fonction de synchronisation
CREATE OR REPLACE FUNCTION public.sync_user_metadata_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  )
  WHERE id = NEW.id;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    raw_app_meta_data,
    '{school_id}',
    CASE WHEN NEW.school_id IS NOT NULL THEN to_jsonb(NEW.school_id) ELSE 'null'::jsonb END
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajout du Trigger
DROP TRIGGER IF EXISTS on_user_updated_sync_jwt ON public.users;
CREATE TRIGGER on_user_updated_sync_jwt
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_metadata_to_jwt();

-- Rétroaction pour les utilisateurs existants
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id, role, school_id FROM public.users
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(u.role)
      ),
      '{school_id}',
      CASE WHEN u.school_id IS NOT NULL THEN to_jsonb(u.school_id) ELSE 'null'::jsonb END
    )
    WHERE id = u.id;
  END LOOP;
END;
$$;
