# Contexto Técnico para IA — Hostelegal

> Este archivo resume las decisiones técnicas críticas ya resueltas en este proyecto.
> Léelo antes de proponer cambios en las áreas de autenticación, enrutamiento o administración de usuarios.

---

## 1. Fix de carga infinita en `App.tsx`

### El problema

La aplicación sufría un bucle de redirección y una pantalla de carga infinita cuando el usuario navegaba manualmente a una URL (e.g., recargando `/dashboard`). La causa raíz era una **condición de carrera**: el enrutador de React intentaba evaluar las rutas protegidas antes de que se conociera el rol del usuario (`isAdmin`).

El flujo roto era:
1. La app carga → `session = null`, `isAdmin = null` → spinner
2. `getSession()` devuelve una sesión → `session` se actualiza, pero `isAdmin` sigue en `null`
3. El router evalúa `session && isAdmin` → `isAdmin` es `null`, no `false`, por lo que la guardia no funciona bien
4. Se lanza una redirección prematura antes de que la consulta a `empresas` termine

### La solución implementada

**Archivo**: `src/App.tsx`

**Patrón**: bloqueo total del enrutador hasta que **ambos** estados estén resueltos.

```typescript
// Estado con tres fases: null (cargando), true (admin), false (cliente)
const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
const [isLoading, setIsLoading] = useState(true);

// La "aduana": el router NO existe en el DOM hasta que ambos estados son conocidos
if (isLoading || (session && isAdmin === null)) {
  return <Loader2 className="animate-spin" />;
}
```

**Función blindada `fetchRoleAndSetSession`**: siempre llama a `setIsLoading(false)` en el bloque `finally`, independientemente de si la consulta a Supabase falla o no. Esto garantiza que el spinner nunca se quede girado eternamente.

```typescript
const fetchRoleAndSetSession = async (currentSession) => {
  // ...consulta a tabla empresas...
  } finally {
    if (isMounted) setIsLoading(false); // LA GARANTÍA
  }
};
```

**Flag `isMounted`**: evita que los `setState` se ejecuten después de que el componente se desmonte (e.g., si el usuario navega durante la carga), previniendo memory leaks y errores de React en desarrollo.

---

## 2. Por qué se usa `.maybeSingle()` en lugar de `.single()`

### El problema con `.single()`

Supabase lanza un **error** si `.single()` no encuentra exactamente una fila. En el contexto de `fetchRoleAndSetSession`, si un usuario de Auth existe pero su fila en `empresas` no fue creada aún (e.g., fallo en el trigger), `.single()` lanzaría una excepción que dejaría `isAdmin` en `null` y causaría la carga infinita descrita arriba.

### La solución: `.maybeSingle()`

```typescript
// En App.tsx — consulta del rol
const { data, error } = await supabase
  .from('empresas')
  .select('es_admin')
  .eq('id', currentSession.user.id)
  .maybeSingle(); // ← Devuelve null si no existe la fila; no lanza error
```

`.maybeSingle()` devuelve `data = null` si no encuentra la fila (0 resultados) y lanza error solo si encuentra **más de una** fila. Esto hace el código robusto ante:
- Usuarios que aún no tienen perfil de empresa (fallo temporal del trigger).
- Datos en estado transitorio durante migraciones.

La operación `!!data?.es_admin` convierte correctamente `null` en `false`, denegando el acceso de admin por defecto. **El principio de seguridad es: ante la duda, denegar.**

> **Regla**: Usa `.maybeSingle()` cuando la ausencia de fila es un caso válido (no un error de integridad). Usa `.single()` solo cuando la presencia de exactamente una fila es un invariante del negocio que debe romperse en error si no se cumple.

---

## 3. Por qué las operaciones de admin usan Edge Functions

### El problema

Las operaciones de administración de usuarios (crear, editar, eliminar cuentas en `auth.users`) requieren la **`SUPABASE_SERVICE_ROLE_KEY`**, que tiene permisos totales y **bypasea RLS**. Esta clave nunca puede enviarse al cliente.

### La solución: Edge Function como intermediario seguro

**Archivo**: `supabase/functions/admin-users/index.ts`

La Edge Function actúa como un "proxy seguro" con doble verificación:

```
Panel Admin (React, anon key)
    │
    │  Authorization: Bearer <JWT del admin>
    ▼
Edge Function: admin-users  (Deno, ejecutada en servidor Supabase)
    ├─ 1. Verifica que el JWT es válido (supabaseAdmin.auth.getUser)
    ├─ 2. Comprueba en BD que es_admin = TRUE para ese usuario
    └─ 3. Si ambas pasan: ejecuta la acción con SERVICE_ROLE_KEY
              └─ createUser / updateUser / deleteUser
```

**Acciones disponibles** (campo `action` en el body JSON):
- `create_user`: crea usuario con email confirmado automáticamente.
- `update_user`: cambia email y/o contraseña sin enviar emails de verificación.
- `delete_user`: elimina el usuario de `auth.users` (el CASCADE borra `empresas`).

### Por qué NO usar el cliente con service role key

Enviar la `SERVICE_ROLE_KEY` al frontend JavaScript significa que cualquier usuario que abra las DevTools del navegador puede robarla y tener control total sobre toda la base de datos. Esto es una vulnerabilidad crítica e inaceptable.

### Configuración requerida

La `SUPABASE_SERVICE_ROLE_KEY` se configura como **secret** en Supabase:
- Panel de Supabase → **Project Settings → Edge Functions → Secrets**
- Nombre del secret: `SUPABASE_SERVICE_ROLE_KEY`

La Edge Function la lee con `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`, nunca está en el repositorio.

---

## 4. Otras decisiones técnicas relevantes

### Cierre de sesión por inactividad (`useInactivity`)

**Archivo**: `src/hooks/useInactivity.ts`

El hook escucha eventos del DOM (`mousemove`, `mousedown`, `keydown`, `wheel`, `touchstart`) y resetea un timer de 30 minutos. Si expira, llama a `supabase.auth.signOut()`. El hook solo se activa si `isActive = true` (i.e., hay sesión). Se usa en `App.tsx` con `useInactivity(!!session, 30)`.

### Verificación de suscripción en el cliente

La fecha `fecha_caducidad_suscripcion` en `empresas` se compara con `new Date()` en `Dashboard.tsx` al montar. Si ha expirado, se muestra un modal de bloqueo total. La RLS no bloquea por caducidad en la versión actual; el bloqueo es solo de presentación.

### Vista pública de carta (sin autenticación)

La ruta `/carta/:id` renderiza `PublicMenu.tsx` y consulta la tabla `cartas`. Para que esto funcione sin JWT, la política RLS de `cartas` incluye `OR auth.role() = 'anon'`. Si esta política cambia, la vista pública del QR dejará de funcionar.

### Integración con Tally (formulario APPCC)

El formulario APPCC está hospedado en `tally.so` e incrustado en un `<iframe>`. La comunicación se realiza mediante `window.postMessage`: Tally emite `{ event: "Tally.FormSubmitted" }` al contexto padre. El componente `Documentation.tsx` escucha este evento para incrementar el contador en Supabase. Make.com gestiona la generación y envío del PDF por separado.

---

## Mapa de rutas y componentes

| Ruta | Componente | Acceso |
|---|---|---|
| `/login` | `auth/Login.tsx` | Público (redirige si hay sesión) |
| `/recuperar` | `auth/RecuperarPassword.tsx` | Público |
| `/actualizar-contrasena` | `auth/ActualizarPassword.tsx` | Público (requiere token válido en URL) |
| `/dashboard` | `dashboard/Dashboard.tsx` | Solo clientes (`!isAdmin`) |
| `/constructor` | `dish-builder/MenuBuilder.tsx` | Solo clientes |
| `/documentacion` | `documentation/Documentation.tsx` | Solo clientes |
| `/repositorio` | `repository/Repository.tsx` | Solo clientes |
| `/admin` | `admin/AdminDashboard.tsx` | Solo administradores (`isAdmin`) |
| `/carta/:id` | `public-menu/PublicMenu.tsx` | Totalmente público (sin auth) |
