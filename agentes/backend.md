# Agente backend

## Objetivo

Corregir la autorización de empresas y administración, separar borradores de cartas publicadas y trasladar al servidor las operaciones sensibles.

## Alcance asignado

- `DATABASE_SCHEMA.sql`
- `supabase/migrations/`
- `supabase/functions/admin-users/`
- `supabase/tests/` y `tests/backend-sql.test.ts`
- `src/features/admin/`

## Resultado

- Políticas que impiden al cliente modificar rol, suscripción y cuota.
- RPC para guardar borrador, publicar una carta y consultar una carta pública.
- Identificación explícita del propietario para evitar escrituras de una sesión anterior.
- Publicación condicionada a suscripción activa y alérgenos revisados.
- Contabilización documental idempotente para integraciones con privilegios de servicio.
- Creación y actualización administrativa centralizadas en la Edge Function.
- Migración conservadora: detecta cartas duplicadas antes de crear la unicidad y no elimina datos.

## Verificación

Las pruebas SQL con PostgreSQL embebido cubren permisos, aislamiento, publicación, caducidad, validación y cuota. La Edge Function requiere validación final en Supabase porque Deno no está instalado localmente.

