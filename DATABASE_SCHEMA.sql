-- =============================================================================
-- HOSTELEGAL — ESQUEMA DE BASE DE DATOS
-- =============================================================================
-- Motor: PostgreSQL 17 (Supabase)
-- Última actualización: Mayo 2026
--
-- CONTENIDO:
--   1. Tabla: empresas
--   2. Tabla: cartas
--   3. Función: is_admin()
--   4. Trigger: crear_perfil_empresa (on auth.users INSERT)
--   5. Políticas RLS: empresas
--   6. Políticas RLS: cartas
-- =============================================================================


-- =============================================================================
-- 1. TABLA: empresas
-- =============================================================================
-- Extiende la tabla `auth.users` de Supabase con los datos de negocio de cada
-- empresa cliente. La clave primaria es el mismo UUID que Supabase genera en
-- `auth.users`, estableciendo una relación 1:1 garantizada por el trigger
-- `crear_perfil_empresa` (ver sección 4).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.empresas (
    -- FK al usuario de Supabase Auth. Al borrar el usuario auth, se borra el perfil.
    id                              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Nombre del establecimiento hostelero. Se muestra en la cabecera del PDF
    -- y en la vista pública de la carta de alérgenos.
    nombre_restaurante              TEXT,

    -- Flag de rol. TRUE = acceso al panel /admin con control total de usuarios.
    -- FALSE (o NULL) = cliente normal con acceso a /dashboard.
    -- IMPORTANTE: Este campo lo gestiona EXCLUSIVAMENTE el administrador a través
    -- de la Edge Function `admin-users`. Nunca debe ser modificable por el propio usuario.
    es_admin                        BOOLEAN DEFAULT FALSE NOT NULL,

    -- Fecha hasta la que la empresa tiene acceso activo a la plataforma.
    -- El componente Dashboard.tsx compara esta fecha con `new Date()` al cargar.
    -- Si está en el pasado, se muestra un modal de bloqueo total y solo se puede
    -- cerrar sesión. La RLS NO bloquea el acceso por caducidad: eso es
    -- responsabilidad del frontend y de una posible revisión futura de políticas.
    fecha_caducidad_suscripcion     TIMESTAMPTZ,

    -- Contador de documentos APPCC generados en el plan actual.
    -- Se incrementa en el frontend (Documentation.tsx) cuando el evento
    -- `Tally.FormSubmitted` es recibido por postMessage desde el iframe de Tally.
    -- El límite actual es 5 (constante LIMITE_DOCS en Documentation.tsx).
    documentos_generados            INTEGER DEFAULT 0 NOT NULL,

    -- Metadatos de auditoría
    creado_en                       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.empresas IS
    'Perfiles de empresas clientes de Hostelegal. Extiende auth.users con datos de negocio. Relación 1:1 con auth.users garantizada por el trigger crear_perfil_empresa.';

COMMENT ON COLUMN public.empresas.es_admin IS
    'Flag de rol administrador. Solo modificable por la Edge Function admin-users usando SERVICE_ROLE_KEY. Nunca exponer a mutación directa del cliente.';

COMMENT ON COLUMN public.empresas.fecha_caducidad_suscripcion IS
    'Fecha de fin de suscripción. El frontend bloquea la UI si esta fecha es pasada, pero la RLS no lo enforce. Considerar agregar una política basada en esta fecha en versiones futuras.';

COMMENT ON COLUMN public.empresas.documentos_generados IS
    'Número de documentos APPCC generados. Límite actual: 5. Se actualiza directamente desde el frontend al detectar el evento postMessage de Tally.';


-- =============================================================================
-- 2. TABLA: cartas
-- =============================================================================
-- Almacena las cartas de alérgenos digitales creadas por cada empresa.
-- El `id` de esta tabla es el que se codifica en el QR generado por el
-- constructor. La ruta pública `/carta/:id` usa este UUID para cargar la carta.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cartas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK a la empresa propietaria. La RLS usa este campo para garantizar aislamiento.
    empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,

    -- Nombre personalizado de esta carta concreta (e.g. "Carta de Verano 2025").
    -- Si está vacío, la vista pública usa `empresas.nombre_restaurante` como fallback.
    nombre_carta    TEXT,

    -- Array JSON de platos. Estructura: Dish[] según el tipo definido en
    -- src/features/dish-builder/store/useMenuStore.ts
    -- Cada plato contiene: { id, name, ingredients: [{ id, name, allergens[] }] }
    platos          JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Metadatos de auditoría
    creado_en       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    actualizado_en  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.cartas IS
    'Cartas de alérgenos digitales. El UUID de cada fila se codifica en el QR y es el parámetro :id de la ruta pública /carta/:id.';

COMMENT ON COLUMN public.cartas.platos IS
    'Array JSON de platos con ingredientes y alérgenos. Estructura: Dish[] de useMenuStore.ts. Cada alérgeno es un AllergenId del enum de 14 valores del Reglamento UE 1169/2011.';


-- =============================================================================
-- 3. FUNCIÓN: is_admin()
-- =============================================================================
-- Función de seguridad DEFINER utilizada en las políticas RLS para verificar
-- si el usuario actual es administrador sin necesidad de hacer un JOIN en cada
-- consulta. Al ser SECURITY DEFINER, se ejecuta con los permisos del propietario
-- (postgres), no del usuario que la invoca, evitando recursión en RLS.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE  -- No modifica la BD; puede ser cacheada dentro de la misma transacción
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.empresas
        WHERE id = auth.uid()
          AND es_admin = TRUE
    );
$$;

COMMENT ON FUNCTION public.is_admin() IS
    'Devuelve TRUE si el usuario autenticado actual tiene es_admin=TRUE en la tabla empresas. Usar en políticas RLS para simplificar la lógica de autorización de administrador.';


-- =============================================================================
-- 4. TRIGGER: crear_perfil_empresa
-- =============================================================================
-- Se dispara automáticamente después de que Supabase crea un nuevo usuario en
-- `auth.users`. Inserta una fila en `public.empresas` con el mismo UUID,
-- garantizando que SIEMPRE exista un perfil de empresa para cada usuario de auth.
--
-- El `nombre_restaurante` se intenta leer de los `raw_user_meta_data` del
-- usuario, que el administrador puede pasar al crear usuarios vía la Edge
-- Function `admin-users` (campo `user_metadata.nombre_restaurante`).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.empresas (id, nombre_restaurante, es_admin)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'nombre_restaurante',  -- Puede ser NULL si no se envió
        FALSE  -- Todos los usuarios nuevos son clientes; el admin se asigna manualmente
    );
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
    'Crea automáticamente el perfil de empresa en public.empresas cuando se registra un nuevo usuario en auth.users. Garantiza la relación 1:1. Todos los usuarios nuevos reciben es_admin=FALSE por defecto.';

-- Elimina el trigger si ya existe antes de recrearlo (idempotente)
DROP TRIGGER IF EXISTS crear_perfil_empresa ON auth.users;

CREATE TRIGGER crear_perfil_empresa
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER crear_perfil_empresa ON auth.users IS
    'Dispara handle_new_user() tras cada INSERT en auth.users para crear el perfil de empresa correspondiente.';


-- =============================================================================
-- 5. POLÍTICAS RLS: empresas
-- =============================================================================
-- IMPORTANTE: Activar RLS antes de crear las políticas.
-- =============================================================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Una empresa solo puede leer su propio perfil.
-- El administrador puede leer TODOS los perfiles para gestionar usuarios.
CREATE POLICY "empresas_select"
    ON public.empresas
    FOR SELECT
    USING (
        auth.uid() = id          -- El propio usuario ve su perfil
        OR public.is_admin()     -- El admin ve todos los perfiles
    );

-- Un usuario solo puede actualizar su propio perfil (e.g., cambiar nombre_restaurante).
-- La migración al final restringe UPDATE por columna: RLS por sí sola no protege es_admin.
-- Solo nombre_restaurante es editable directamente por el cliente.
CREATE POLICY "empresas_update_own"
    ON public.empresas
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Solo el sistema (Edge Function con SERVICE_ROLE_KEY, que bypasea RLS) puede INSERT.
-- El trigger handle_new_user() se ejecuta como SECURITY DEFINER y también bypasea RLS.
-- Esta política deniega INSERT desde el cliente para prevenir auto-registro de perfiles.
CREATE POLICY "empresas_no_insert_from_client"
    ON public.empresas
    FOR INSERT
    WITH CHECK (FALSE);

-- Solo el sistema puede eliminar perfiles de empresa.
-- El CASCADE en la FK de auth.users gestiona el borrado real (vía Edge Function admin-users).
CREATE POLICY "empresas_no_delete_from_client"
    ON public.empresas
    FOR DELETE
    USING (FALSE);


-- =============================================================================
-- 6. POLÍTICAS RLS: cartas
-- =============================================================================

ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;

-- SELECT: El propietario ve sus cartas. La vista PÚBLICA (/carta/:id) funciona
-- porque Supabase trata las peticiones sin JWT como `anon` y esta política
-- necesita ser ajustada para permitir lectura pública del QR.
--
-- OPCIÓN A — Solo el dueño (privado, requiere auth para ver la carta pública):
-- USING (empresa_id = auth.uid())
--
-- OPCIÓN B — El dueño Y cualquier usuario anónimo (para el QR público):
CREATE POLICY "cartas_select"
    ON public.cartas
    FOR SELECT
    USING (
        empresa_id = auth.uid()  -- El propietario autenticado
        OR auth.role() = 'anon'  -- Cualquier visitante del QR (sin autenticación)
    );

-- INSERT: Solo el propietario puede crear cartas asociadas a su empresa.
-- La condición WITH CHECK evita que un usuario inserte una carta con el
-- empresa_id de otro usuario.
CREATE POLICY "cartas_insert"
    ON public.cartas
    FOR INSERT
    WITH CHECK (empresa_id = auth.uid());

-- UPDATE: Solo el propietario puede modificar sus cartas.
CREATE POLICY "cartas_update"
    ON public.cartas
    FOR UPDATE
    USING (empresa_id = auth.uid())
    WITH CHECK (empresa_id = auth.uid());

-- DELETE: Solo el propietario puede eliminar sus cartas.
CREATE POLICY "cartas_delete"
    ON public.cartas
    FOR DELETE
    USING (empresa_id = auth.uid());

-- Upgrades below are also available individually for existing databases:
-- supabase/migrations/202609070001_secure_menu_import.sql
-- It adds draft/publication fields, secure RPCs, email synchronization and column permissions.
-- The complete file includes the current deployment schema.

-- CURRENT SCHEMA: security and publication upgrades (also versioned separately).
-- Apply before deploying the matching frontend and admin-users function.
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

-- RLS controls rows; column privileges separately protect roles, subscriptions and quotas.
REVOKE INSERT, UPDATE, DELETE ON public.empresas FROM PUBLIC, anon, authenticated;
GRANT UPDATE(nombre_restaurante) ON public.empresas TO authenticated;
GRANT SELECT ON public.empresas TO authenticated;
REVOKE ALL ON public.cartas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cartas TO authenticated;
DROP POLICY IF EXISTS cartas_select ON public.cartas;
CREATE POLICY cartas_select ON public.cartas FOR SELECT TO authenticated
 USING (empresa_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS cartas_insert ON public.cartas;
DROP POLICY IF EXISTS cartas_update ON public.cartas;
DROP POLICY IF EXISTS cartas_delete ON public.cartas;

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
  IF (plato ? 'dishAllergens') <> (plato ? 'dishAllergensReviewed')
   OR (plato ? 'dishAllergens' AND jsonb_typeof(plato->'dishAllergens') <> 'array')
   OR (plato ? 'dishAllergensReviewed' AND jsonb_typeof(plato->'dishAllergensReviewed') <> 'boolean') THEN
   RAISE EXCEPTION 'Declaración de alérgenos del plato no válida.';
  END IF;
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
     OR (ingrediente ? 'isDishSummary' AND jsonb_typeof(ingrediente->'isDishSummary') <> 'boolean') THEN RAISE EXCEPTION 'Ingrediente no válido.'; END IF;
   IF ingrediente ? 'allergensReviewed' AND jsonb_typeof(ingrediente->'allergensReviewed') <> 'boolean' THEN RAISE EXCEPTION 'Estado de revisión no válido.'; END IF;
   FOR alergeno IN SELECT value FROM jsonb_array_elements(ingrediente->'allergens') LOOP
    IF jsonb_typeof(alergeno) <> 'string' OR NOT ((alergeno #>> '{}') = ANY(ARRAY['GLUTEN','CRUSTACEOS','HUEVOS','PESCADO','CACAHUETES','SOJA','LACTEOS','FRUTOS_DE_CASCARA','APIO','MOSTAZA','SESAMO','SULFITOS','ALTRAMUCES','MOLUSCOS'])) THEN RAISE EXCEPTION 'Alérgeno no reconocido.'; END IF;
   END LOOP;
    IF p_publicar AND NOT (plato ? 'dishAllergens') AND NOT (coalesce(ingrediente->'allergensReviewed' = 'true'::jsonb, false)
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
-- Only trusted automation may reserve a document generation. A repeated event is free.
BEGIN;
CREATE TABLE IF NOT EXISTS public.envios_documentales (
 event_id text PRIMARY KEY,
 empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
 creado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.envios_documentales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.envios_documentales FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.registrar_envio_documental(p_empresa_id uuid, p_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE empresa public.empresas%ROWTYPE; event_owner uuid;
BEGIN
 IF p_event_id IS NULL OR length(btrim(p_event_id)) = 0 OR length(p_event_id) > 200 THEN RAISE EXCEPTION 'Identificador de envío no válido.'; END IF;
 -- Serializes requests for an owner; the global advisory lock also serializes shared event IDs.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id, 0));
 SELECT * INTO empresa FROM public.empresas WHERE id = p_empresa_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('accepted',false,'reason','unknown_company'); END IF;
 SELECT empresa_id INTO event_owner FROM public.envios_documentales WHERE event_id = p_event_id;
 IF FOUND THEN
  IF event_owner <> p_empresa_id THEN RETURN jsonb_build_object('accepted',false,'reason','event_conflict'); END IF;
  RETURN jsonb_build_object('accepted',true,'duplicate',true,'documentos_generados',empresa.documentos_generados);
 END IF;
 IF empresa.fecha_caducidad_suscripcion IS NOT NULL AND empresa.fecha_caducidad_suscripcion <= now() THEN
  RETURN jsonb_build_object('accepted',false,'reason','expired_subscription');
 END IF;
 IF empresa.documentos_generados >= 5 THEN RETURN jsonb_build_object('accepted',false,'reason','quota_exceeded'); END IF;
 INSERT INTO public.envios_documentales(event_id,empresa_id) VALUES(p_event_id,p_empresa_id);
 UPDATE public.empresas SET documentos_generados = documentos_generados + 1 WHERE id = p_empresa_id;
 RETURN jsonb_build_object('accepted',true,'duplicate',false,'documentos_generados',empresa.documentos_generados + 1);
END $$;
REVOKE ALL ON FUNCTION public.registrar_envio_documental(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_envio_documental(uuid,text) TO service_role;
COMMIT;
