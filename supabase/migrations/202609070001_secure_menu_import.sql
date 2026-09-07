-- Compatibility phase: apply before testing the matching frontend in Preview.
-- Stops on duplicate owners: resolve them explicitly; this migration never deletes data.
BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.cartas GROUP BY empresa_id HAVING count(*) > 1) THEN
  RAISE EXCEPTION 'Hay empresas con varias cartas. Resolver duplicados conservando datos antes de migrar.';
 END IF;
END $$;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS email text;
UPDATE public.empresas e SET email = u.email FROM auth.users u WHERE u.id = e.id;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS borrador_platos jsonb;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS borrador_nombre_carta text;
-- In the legacy editor an empty allergens array meant "none" and there was no
-- review flag. Seed only missing drafts with that established meaning. New
-- imports write allergensReviewed=false explicitly when the Excel cell is blank.
UPDATE public.cartas AS carta
SET borrador_platos = (
 SELECT coalesce(jsonb_agg(
  jsonb_set(
   plato.value,
   '{ingredients}',
   coalesce((
    SELECT jsonb_agg(
     CASE WHEN ingrediente.value ? 'allergensReviewed' THEN ingrediente.value
      ELSE ingrediente.value || '{"allergensReviewed":true}'::jsonb END
     ORDER BY ingrediente.ordinality
    )
    FROM jsonb_array_elements(plato.value->'ingredients') WITH ORDINALITY AS ingrediente(value, ordinality)
   ), '[]'::jsonb)
  ) ORDER BY plato.ordinality
 ), '[]'::jsonb)
 FROM jsonb_array_elements(carta.platos) WITH ORDINALITY AS plato(value, ordinality)
)
WHERE carta.borrador_platos IS NULL AND jsonb_typeof(carta.platos) = 'array';
UPDATE public.cartas SET borrador_nombre_carta = nombre_carta WHERE borrador_nombre_carta IS NULL;
-- NULL identifies legacy rows only; subsequent executions preserve unpublished drafts.
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS publicado boolean;
UPDATE public.cartas SET publicado = true WHERE publicado IS NULL;
ALTER TABLE public.cartas ALTER COLUMN publicado SET DEFAULT false;
ALTER TABLE public.cartas ALTER COLUMN publicado SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cartas_empresa_id_unique ON public.cartas(empresa_id);

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.empresas WHERE id = auth.uid() AND es_admin);
$$;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.empresas(id, nombre_restaurante, email, es_admin)
 VALUES(NEW.id, NEW.raw_user_meta_data->>'nombre_restaurante', NEW.email, false);
 RETURN NEW;
END $$;
-- Auth owns the email; synchronization also covers email changes outside this panel.
CREATE OR REPLACE FUNCTION public.sync_empresa_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 UPDATE public.empresas SET email = NEW.email WHERE id = NEW.id;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sincronizar_email_empresa ON auth.users;
CREATE TRIGGER sincronizar_email_empresa AFTER UPDATE OF email ON auth.users
 FOR EACH ROW EXECUTE FUNCTION public.sync_empresa_email();

-- Legacy table permissions remain temporarily so the production frontend keeps
-- working while this version is exercised in Vercel Preview. Apply the cutover
-- script together with the production frontend to remove direct client access.

CREATE OR REPLACE FUNCTION public.validar_datos_carta(p_platos jsonb, p_nombre text, p_publicar boolean)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE plato jsonb; ingrediente jsonb; alergeno jsonb;
BEGIN
 IF p_nombre IS NULL OR length(p_nombre) > 80 OR (p_publicar AND btrim(p_nombre) = '') THEN
  RAISE EXCEPTION 'Nombre de carta no válido (máximo 80 caracteres).';
 END IF;
 IF p_platos IS NULL OR jsonb_typeof(p_platos) <> 'array' THEN RAISE EXCEPTION 'La carta debe ser una lista.'; END IF;
 IF jsonb_array_length(p_platos) > 300 OR octet_length(p_platos::text) > 5000000 THEN RAISE EXCEPTION 'La carta supera el límite permitido.'; END IF;
 IF p_publicar AND jsonb_array_length(p_platos) = 0 THEN RAISE EXCEPTION 'Añade platos antes de publicar.'; END IF;
 FOR plato IN SELECT value FROM jsonb_array_elements(p_platos) LOOP
  IF jsonb_typeof(plato) <> 'object' OR jsonb_typeof(plato->'id') IS DISTINCT FROM 'string'
   OR coalesce(plato->>'id', '') = '' OR jsonb_typeof(plato->'name') IS DISTINCT FROM 'string'
   OR btrim(coalesce(plato->>'name','')) = '' OR length(plato->>'name') > 120
   OR jsonb_typeof(plato->'ingredients') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Plato no válido.'; END IF;
  IF jsonb_array_length(plato->'ingredients') = 0 OR jsonb_array_length(plato->'ingredients') > 100 THEN RAISE EXCEPTION 'Cada plato necesita entre 1 y 100 ingredientes.'; END IF;
  FOR ingrediente IN SELECT value FROM jsonb_array_elements(plato->'ingredients') LOOP
   IF jsonb_typeof(ingrediente) <> 'object' OR jsonb_typeof(ingrediente->'id') IS DISTINCT FROM 'number'
    OR (ingrediente->>'id') !~ '^[0-9]+$' OR (ingrediente->>'id')::numeric > 9007199254740991
    OR jsonb_typeof(ingrediente->'name') IS DISTINCT FROM 'string'
    OR btrim(coalesce(ingrediente->>'name','')) = '' OR length(ingrediente->>'name') > 160
    OR jsonb_typeof(ingrediente->'allergens') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Ingrediente no válido.'; END IF;
   IF ingrediente ? 'allergensReviewed' AND jsonb_typeof(ingrediente->'allergensReviewed') <> 'boolean' THEN RAISE EXCEPTION 'Estado de revisión no válido.'; END IF;
   FOR alergeno IN SELECT value FROM jsonb_array_elements(ingrediente->'allergens') LOOP
    IF jsonb_typeof(alergeno) <> 'string' OR NOT ((alergeno #>> '{}') = ANY(ARRAY['GLUTEN','CRUSTACEOS','HUEVOS','PESCADO','CACAHUETES','SOJA','LACTEOS','FRUTOS_DE_CASCARA','APIO','MOSTAZA','SESAMO','SULFITOS','ALTRAMUCES','MOLUSCOS'])) THEN RAISE EXCEPTION 'Alérgeno no reconocido.'; END IF;
   END LOOP;
   IF p_publicar AND NOT (coalesce(ingrediente->'allergensReviewed' = 'true'::jsonb, false)
    OR (NOT (ingrediente ? 'allergensReviewed') AND jsonb_array_length(ingrediente->'allergens') > 0)) THEN
    RAISE EXCEPTION 'Revisa los alérgenos de todos los ingredientes antes de publicar.';
   END IF;
  END LOOP;
  IF (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(plato->'ingredients')) THEN RAISE EXCEPTION 'Hay identificadores de ingredientes repetidos en un plato.'; END IF;
 END LOOP;
 IF (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(p_platos)) THEN RAISE EXCEPTION 'Hay identificadores de platos repetidos.'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guardar_borrador_carta(p_platos jsonb, p_nombre text, p_empresa_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE carta_id uuid;
BEGIN
 IF auth.uid() IS NULL OR p_empresa_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (SELECT 1 FROM public.empresas WHERE id = auth.uid()
  AND (fecha_caducidad_suscripcion IS NULL OR fecha_caducidad_suscripcion > now())) THEN RAISE EXCEPTION 'Sesión o suscripción no válida.' USING ERRCODE = '42501'; END IF;
 PERFORM public.validar_datos_carta(p_platos, p_nombre, false);
 INSERT INTO public.cartas(empresa_id,borrador_platos,borrador_nombre_carta)
 VALUES(auth.uid(),p_platos,p_nombre)
 ON CONFLICT (empresa_id) DO UPDATE SET borrador_platos = EXCLUDED.borrador_platos,
  borrador_nombre_carta = EXCLUDED.borrador_nombre_carta
 RETURNING id INTO carta_id;
 RETURN carta_id;
END $$;
CREATE OR REPLACE FUNCTION public.publicar_carta(p_platos jsonb, p_nombre text, p_empresa_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE carta_id uuid;
BEGIN
 IF auth.uid() IS NULL OR p_empresa_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (SELECT 1 FROM public.empresas WHERE id = auth.uid()
  AND (fecha_caducidad_suscripcion IS NULL OR fecha_caducidad_suscripcion > now())) THEN RAISE EXCEPTION 'Sesión o suscripción no válida.' USING ERRCODE = '42501'; END IF;
 PERFORM public.validar_datos_carta(p_platos,p_nombre,true);
 INSERT INTO public.cartas(empresa_id,platos,nombre_carta,borrador_platos,borrador_nombre_carta,publicado)
 VALUES(auth.uid(),p_platos,p_nombre,p_platos,p_nombre,true)
 ON CONFLICT (empresa_id) DO UPDATE SET platos = EXCLUDED.platos, nombre_carta = EXCLUDED.nombre_carta,
  borrador_platos = EXCLUDED.borrador_platos,borrador_nombre_carta = EXCLUDED.borrador_nombre_carta,
  publicado = true, actualizado_en = now()
 RETURNING id INTO carta_id;
 RETURN carta_id;
END $$;
CREATE OR REPLACE FUNCTION public.obtener_carta_publica(p_id uuid)
RETURNS TABLE(id uuid, platos jsonb, nombre_carta text, actualizado_en timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT c.id,c.platos,coalesce(nullif(c.nombre_carta,''),e.nombre_restaurante),c.actualizado_en
 FROM public.cartas c JOIN public.empresas e ON e.id = c.empresa_id
 WHERE c.id = p_id AND c.publicado;
$$;
REVOKE ALL ON FUNCTION public.validar_datos_carta(jsonb,text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guardar_borrador_carta(jsonb,text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publicar_carta(jsonb,text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obtener_carta_publica(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_borrador_carta(jsonb,text,uuid), public.publicar_carta(jsonb,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_carta_publica(uuid) TO anon, authenticated;
COMMIT;


