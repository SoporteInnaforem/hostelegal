# Guía de Contribución — Hostelegal

Bienvenido al proyecto. Esta guía describe las convenciones técnicas que **debes seguir** para mantener la coherencia del código y la seguridad de la plataforma.

---

## 📐 Arquitectura: Feature-Sliced Design (FSD)

El código fuente sigue una adaptación de **Feature-Sliced Design**. La regla fundamental es:

> **El código se organiza por dominio de negocio, no por tipo de archivo.**

### Estructura de `src/`

```
src/
├── features/          ← Módulos de negocio independientes
│   ├── auth/          ← Login, recuperación, actualización de contraseña
│   ├── admin/         ← Panel exclusivo del administrador
│   ├── dashboard/     ← Menú principal del cliente
│   ├── dish-builder/  ← Constructor de cartas de alérgenos
│   │   ├── components/
│   │   ├── store/     ← Estado Zustand del módulo
│   │   └── utils/
│   ├── documentation/ ← Generador APPCC (integración Tally)
│   ├── public-menu/   ← Carta pública accesible por QR (sin auth)
│   └── repository/    ← Descarga de documentos desde Google Drive
├── hooks/             ← Hooks transversales (e.g. useInactivity)
├── lib/               ← Infraestructura compartida (cliente Supabase)
└── App.tsx            ← Enrutador raíz y orquestador de autenticación
```

### Reglas de FSD

| Regla | Descripción |
|---|---|
| **Aislamiento** | Una feature **no debe importar** de otra feature directamente. Los tipos compartidos van en `lib/` o se re-exportan desde el store. |
| **Punto de entrada único** | `App.tsx` es el único lugar donde se ensamblan las rutas y se gestiona el estado de sesión global. |
| **No lógica en JSX** | La lógica de negocio va en funciones nombradas o hooks. Los retornos JSX deben ser declarativos y fáciles de leer. |
| **Componentes internos** | Los subcomponentes exclusivos de una feature van en `features/<nombre>/components/`, nunca en `src/components/` global. |

---

## 🐻 Estado global: Zustand

Usamos **Zustand** para el estado de larga vida que debe sobrevivir a la navegación entre páginas (e.g., el menú de alérgenos que se está construyendo).

### Convenciones del store

```typescript
// ✅ CORRECTO: Estado e interfaces claramente separados
interface MenuState { menu: Dish[]; draftDish: Dish; }
interface MenuActions { saveDishToMenu(): void; cancelEdit(): void; }

export const useMenuStore = create<MenuState & MenuActions>()(
  devtools(
    (set, get) => ({ /* implementación */ }),
    { name: 'MenuStore' } // ← nombre visible en Redux DevTools
  )
);
```

- **Siempre usa `devtools`**: facilita el debugging. El tercer argumento de `set` es el nombre de la acción (e.g. `'menu/saveDishToMenu'`).
- **Separa State y Actions** en interfaces distintas.
- **Un store por feature**: `useMenuStore` para dish-builder, etc.
- **No uses Zustand para estado de UI local** (modales abiertos, campos de formulario). Para eso usa `useState` local en el componente.

### Patrón Draft/Commit

El módulo `dish-builder` usa el patrón **borrador → confirmado**:
- `draftDish`: el plato en edición, invisible en la carta final.
- `menu[]`: los platos confirmados que se publican en el PDF y el QR.

Un plato **no aparece en la carta hasta que el usuario lo confirma** con "Añadir a la Carta". Esto evita que datos incompletos lleguen al PDF o a la vista pública.

---

## 🔒 Seguridad: RLS en Supabase

> **La seguridad real vive en la base de datos, no en el frontend.**

### Row Level Security (RLS)

Todas las tablas de datos de negocio tienen RLS activado. La política estándar es:

```sql
-- Cada empresa solo puede leer y modificar sus propios registros
CREATE POLICY "Acceso propio" ON public.mi_tabla
FOR ALL USING (auth.uid() = user_id);
```

**¿Por qué importa esto para el desarrollo?**

- Si añades una nueva tabla, **debes activar RLS y crear sus políticas** antes de hacer PR.
- Nunca asumas que una comprobación de frontend (e.g., ocultar un botón) es suficiente para proteger datos.
- El campo `es_admin` en la tabla `empresas` determina el rol. Su verificación en el frontend es solo para la UX. La autorización real se hace en la **Edge Function** `admin-users`.

### Edge Functions para operaciones privilegiadas

Las acciones de administración de usuarios (crear, modificar, eliminar) **nunca se hacen con la `anon key`**. Se delegan a la Edge Function `supabase/functions/admin-users/index.ts`, que:

1. Verifica el JWT del solicitante.
2. Comprueba en BD que `es_admin = true`.
3. Solo entonces usa la `SUPABASE_SERVICE_ROLE_KEY` para operar.

**Nunca expongas la `SERVICE_ROLE_KEY` en el cliente.** Configúrala como secret en el panel de Supabase.

---

## 🔀 Flujo de autenticación y rutas

El enrutador en `App.tsx` implementa **route guards bidireccionales**:

- Un cliente que accede a `/admin` → redirigido a `/dashboard`.
- Un admin que accede a `/dashboard` → redirigido a `/admin`.
- Cualquier usuario no autenticado en rutas protegidas → redirigido a `/login`.

**Regla crítica**: el router **no renderiza hasta que se conocen tanto la sesión como el rol**. Esto se consigue con el estado `isLoading` y la condición `isAdmin === null`. Si añades nuevas rutas protegidas, sigue el mismo patrón de guardas ya existente.

---

## ✅ Checklist antes de hacer PR

- [ ] ¿Tus nuevas tablas tienen RLS activado y políticas definidas?
- [ ] ¿Has añadido tu nueva feature en `src/features/` respetando el aislamiento?
- [ ] ¿Las operaciones privilegiadas pasan por Edge Function, no por la `anon key`?
- [ ] ¿Has documentado con TSDoc la lógica de negocio no obvia?
- [ ] ¿El store de Zustand usa `devtools` con nombre de acciones?
