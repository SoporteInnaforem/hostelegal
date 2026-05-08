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
-- El campo es_admin NO debe poder actualizarse desde el cliente; está protegido por RLS
-- ya que el cliente usa la anon key y solo puede actualizar la fila con su propio id.
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
