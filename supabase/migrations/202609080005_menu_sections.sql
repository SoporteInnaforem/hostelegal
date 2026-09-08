-- Añade validación para secciones opcionales almacenadas dentro de cada plato.
-- No transforma ni elimina datos existentes y conserva las firmas de las RPC.
BEGIN;

CREATE OR REPLACE FUNCTION public.validar_datos_carta(p_platos jsonb, p_nombre text, p_publicar boolean)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE plato jsonb; ingrediente jsonb; alergeno jsonb;
BEGIN
 IF p_nombre IS NULL OR length(p_nombre) > 80 OR (p_publicar AND btrim(p_nombre) = '') THEN RAISE EXCEPTION 'Nombre de carta no válido (máximo 80 caracteres).'; END IF;
 IF p_platos IS NULL OR jsonb_typeof(p_platos) <> 'array' THEN RAISE EXCEPTION 'La carta debe ser una lista.'; END IF;
 IF jsonb_array_length(p_platos) > 300 OR octet_length(p_platos::text) > 5000000 THEN RAISE EXCEPTION 'La carta supera el límite permitido.'; END IF;
 IF p_publicar AND jsonb_array_length(p_platos) = 0 THEN RAISE EXCEPTION 'Añade platos antes de publicar.'; END IF;
 IF (SELECT count(DISTINCT translate(lower(btrim(value->>'section')), 'áéíóúüñ', 'aeiouun')) FROM jsonb_array_elements(p_platos) WHERE value ? 'section') > 30 THEN RAISE EXCEPTION 'La carta admite un máximo de 30 secciones.'; END IF;
 FOR plato IN SELECT value FROM jsonb_array_elements(p_platos) LOOP
  IF jsonb_typeof(plato) <> 'object' OR jsonb_typeof(plato->'id') IS DISTINCT FROM 'string'
   OR coalesce(plato->>'id', '') = '' OR jsonb_typeof(plato->'name') IS DISTINCT FROM 'string'
   OR btrim(coalesce(plato->>'name','')) = '' OR length(plato->>'name') > 120
   OR jsonb_typeof(plato->'ingredients') IS DISTINCT FROM 'array'
   OR (plato ? 'section' AND (jsonb_typeof(plato->'section') <> 'string' OR btrim(plato->>'section') = '' OR length(plato->>'section') > 60)) THEN RAISE EXCEPTION 'Plato no válido.'; END IF;
  IF jsonb_array_length(plato->'ingredients') = 0 OR jsonb_array_length(plato->'ingredients') > 100 THEN RAISE EXCEPTION 'Cada plato necesita entre 1 y 100 ingredientes.'; END IF;
  IF (plato ? 'dishAllergens') <> (plato ? 'dishAllergensReviewed')
   OR (plato ? 'dishAllergens' AND jsonb_typeof(plato->'dishAllergens') <> 'array')
   OR (plato ? 'dishAllergensReviewed' AND jsonb_typeof(plato->'dishAllergensReviewed') <> 'boolean') THEN RAISE EXCEPTION 'Declaración de alérgenos del plato no válida.'; END IF;
  IF plato ? 'dishAllergens' THEN
   FOR alergeno IN SELECT value FROM jsonb_array_elements(plato->'dishAllergens') LOOP
    IF jsonb_typeof(alergeno) <> 'string' OR NOT ((alergeno #>> '{}') = ANY(ARRAY['GLUTEN','CRUSTACEOS','HUEVOS','PESCADO','CACAHUETES','SOJA','LACTEOS','FRUTOS_DE_CASCARA','APIO','MOSTAZA','SESAMO','SULFITOS','ALTRAMUCES','MOLUSCOS'])) THEN RAISE EXCEPTION 'Alérgeno no reconocido.'; END IF;
   END LOOP;
   IF p_publicar AND plato->'dishAllergensReviewed' <> 'true'::jsonb THEN RAISE EXCEPTION 'Revisa los alérgenos generales de todos los platos antes de publicar.'; END IF;
  END IF;
  FOR ingrediente IN SELECT value FROM jsonb_array_elements(plato->'ingredients') LOOP
   IF jsonb_typeof(ingrediente) <> 'object' OR jsonb_typeof(ingrediente->'id') IS DISTINCT FROM 'number'
    OR (ingrediente->>'id') !~ '^[0-9]+$' OR (ingrediente->>'id')::numeric > 9007199254740991
    OR jsonb_typeof(ingrediente->'name') IS DISTINCT FROM 'string'
    OR btrim(coalesce(ingrediente->>'name','')) = '' OR length(ingrediente->>'name') > 160
    OR jsonb_typeof(ingrediente->'allergens') IS DISTINCT FROM 'array'
    OR (ingrediente ? 'allergensReviewed' AND jsonb_typeof(ingrediente->'allergensReviewed') <> 'boolean')
    OR (ingrediente ? 'isDishSummary' AND jsonb_typeof(ingrediente->'isDishSummary') <> 'boolean') THEN RAISE EXCEPTION 'Ingrediente no válido.'; END IF;
   FOR alergeno IN SELECT value FROM jsonb_array_elements(ingrediente->'allergens') LOOP
    IF jsonb_typeof(alergeno) <> 'string' OR NOT ((alergeno #>> '{}') = ANY(ARRAY['GLUTEN','CRUSTACEOS','HUEVOS','PESCADO','CACAHUETES','SOJA','LACTEOS','FRUTOS_DE_CASCARA','APIO','MOSTAZA','SESAMO','SULFITOS','ALTRAMUCES','MOLUSCOS'])) THEN RAISE EXCEPTION 'Alérgeno no reconocido.'; END IF;
   END LOOP;
   IF p_publicar AND NOT (plato ? 'dishAllergens') AND NOT (coalesce(ingrediente->'allergensReviewed' = 'true'::jsonb, false)
    OR (NOT (ingrediente ? 'allergensReviewed') AND jsonb_array_length(ingrediente->'allergens') > 0)) THEN RAISE EXCEPTION 'Revisa los alérgenos de todos los ingredientes antes de publicar.'; END IF;
  END LOOP;
  IF (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(plato->'ingredients')) THEN RAISE EXCEPTION 'Hay identificadores de ingredientes repetidos en un plato.'; END IF;
 END LOOP;
 IF (SELECT count(*) <> count(DISTINCT value->>'id') FROM jsonb_array_elements(p_platos)) THEN RAISE EXCEPTION 'Hay identificadores de platos repetidos.'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.validar_datos_carta(jsonb,text,boolean) FROM PUBLIC, anon, authenticated;
COMMIT;
