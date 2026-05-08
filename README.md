<div align="center">

# 🍽️ Hostelegal

**La plataforma SaaS todo-en-uno para la digitalización sanitaria del sector hostelero.**

Gestión de APPCC, cartas de alérgenos digitales y documentación regulatoria en una sola aplicación web, segura, moderna y lista para producción.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## 📋 Índice

1. [Características Principales](#-características-principales)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
4. [Flujo de Autenticación y Seguridad](#-flujo-de-autenticación-y-seguridad)
5. [Instalación y Configuración Local](#-instalación-y-configuración-local)
6. [Despliegue en Producción](#-despliegue-en-producción)
7. [Variables de Entorno](#-variables-de-entorno)

---

## ✨ Características Principales

### 🧫 APPCC & Gestión Sanitaria
Control de Análisis de Peligros y Puntos de Control Críticos directamente desde el panel de cliente. Registros digitalizados que eliminan el papel y facilitan las auditorías sanitarias.

### 🥜 Constructor de Cartas de Alérgenos
Editor visual interactivo (`/constructor`) para crear menús con información de alérgenos por plato. Genera un **QR único** que apunta a una carta pública en tiempo real (`/carta/:id`) accesible para cualquier comensal sin necesidad de login.

### 📁 Gestión Documental
Módulo centralizado (`/documentacion`) para subir, organizar y gestionar documentación legal y operativa del establecimiento. Integrado con Supabase Storage.

### 🗄️ Repositorio
Sección dedicada (`/repositorio`) para el acceso rápido a plantillas, normativas y recursos descargables del sector.

### 🛡️ Panel de Administración
Interfaz exclusiva (`/admin`) con control total sobre los usuarios clientes de la plataforma. El administrador puede **crear, modificar y eliminar** cuentas de usuario a través de Supabase Edge Functions, sin acceso a los módulos operativos de los clientes.

### 🔒 Seguridad por Capas
- **Inactividad automática**: cierre de sesión tras 30 minutos de inactividad.
- **RLS (Row Level Security)** en Supabase: cada cliente solo ve sus propios datos.
- **Route Guards bidireccionales**: los clientes no pueden acceder a `/admin` y los administradores no pueden acceder a las rutas de cliente.

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnología | Versión | Rol |
|---|---|---|---|
| **UI Framework** | React | `^19` | Motor de la interfaz de usuario |
| **Lenguaje** | TypeScript | `~6` | Tipado estático en todo el proyecto |
| **Build Tool** | Vite | `^8` | Bundler y servidor de desarrollo |
| **Estilos** | Tailwind CSS | `^4` | Diseño utility-first con variables CSS |
| **Routing** | React Router DOM | `^7` | Enrutamiento SPA y rutas protegidas |
| **Estado Global** | Zustand | `^5` | Estado reactivo ligero (e.g. `menuStore`) |
| **BaaS** | Supabase | `^2` | Auth, PostgreSQL, RLS, Storage y Edge Functions |
| **PDF** | jsPDF + Autotable | `^4 / ^5` | Generación de cartas de alérgenos en PDF |
| **QR** | qrcode.react | `^4` | Generación de QR para cartas públicas |
| **Iconos** | Lucide React | `^1` | Librería de iconos SVG |
| **Despliegue** | Vercel | — | Hosting del frontend SPA |

---

## 🏗️ Arquitectura del Proyecto

El proyecto sigue una adaptación de **Feature-Sliced Design (FSD)**, una arquitectura modular que organiza el código por **dominio de negocio** en lugar de por tipo de archivo. Esto garantiza que cada módulo (feature) sea autónomo, fácil de mantener y escalable de forma independiente.

### Principios Aplicados

- **Aislamiento de features**: cada carpeta en `src/features/` contiene toda la lógica, componentes y estado necesario para esa funcionalidad.
- **Capa `lib`**: contiene código de infraestructura compartido (e.g., el cliente de Supabase).
- **Capa `hooks`**: hooks de utilidad transversales (e.g., `useInactivity`).
- **Punto de entrada único**: `App.tsx` actúa como ensamblador de rutas y orquestador del estado de autenticación global.

### Árbol de Directorios

```
hostelegal-app/
├── public/                       # Activos estáticos (favicon, etc.)
├── supabase/
│   └── functions/
│       └── admin-users/          # Edge Function (Deno) para CRUD de usuarios
│           └── index.ts
├── src/
│   ├── assets/                   # Imágenes y recursos del bundle
│   ├── data/                     # Datos estáticos (e.g., lista de alérgenos)
│   ├── lib/
│   │   └── supabase.ts           # Inicialización del cliente Supabase
│   ├── hooks/
│   │   └── useInactivity.ts      # Hook de cierre de sesión por inactividad
│   ├── features/                 # ← Núcleo de la arquitectura FSD
│   │   ├── auth/                 # Módulo de autenticación
│   │   │   ├── Login.tsx
│   │   │   ├── RecuperarPassword.tsx
│   │   │   └── ActualizarPassword.tsx
│   │   ├── admin/                # Panel exclusivo del administrador
│   │   │   ├── AdminDashboard.tsx
│   │   │   └── store/            # Estado Zustand del panel admin
│   │   ├── dashboard/            # Vista principal del cliente
│   │   │   └── Dashboard.tsx
│   │   ├── dish-builder/         # Constructor de cartas y menús
│   │   │   ├── MenuBuilder.tsx
│   │   │   ├── DishBuilder.tsx
│   │   │   ├── components/       # Subcomponentes del constructor
│   │   │   ├── store/            # Estado Zustand del menú
│   │   │   └── utils/            # Lógica de generación de PDF
│   │   ├── documentation/        # Gestión de documentos legales
│   │   │   └── Documentation.tsx
│   │   ├── public-menu/          # Vista pública de la carta (sin login)
│   │   │   └── PublicMenu.tsx
│   │   └── repository/           # Repositorio de plantillas y normativas
│   │       └── Repository.tsx
│   ├── App.tsx                   # Enrutador raíz y orquestador de auth
│   ├── main.tsx                  # Punto de entrada de la aplicación
│   └── index.css                 # Variables CSS globales y estilos base
├── .env.local                    # Variables de entorno (no se versiona)
├── vercel.json                   # Configuración de rewrites para SPA
├── vite.config.ts
└── package.json
```

---

## 🔐 Flujo de Autenticación y Seguridad

El sistema de seguridad opera en **tres capas independientes** que se refuerzan mutuamente.

### Capa 1: Supabase RLS (Base de Datos)

Cada tabla en PostgreSQL tiene activada la **Row Level Security (RLS)**. Las políticas garantizan que las consultas de un cliente autenticado solo devuelvan filas donde el `user_id` coincide con su propio `auth.uid()`. Un usuario comprometido nunca puede acceder a los datos de otro establecimiento, incluso si manipula las peticiones directamente.

```sql
-- Ejemplo de política RLS aplicada a las tablas de negocio
CREATE POLICY "Los usuarios solo ven sus propios datos"
ON public.mis_datos
FOR ALL
USING (auth.uid() = user_id);
```

### Capa 2: Route Guards en el Frontend

`App.tsx` actúa como una "aduana" de doble dirección. Antes de renderizar cualquier ruta, resuelve el estado de autenticación completo (sesión **y** rol) de forma asíncrona:

```
[URL solicitada]
      │
      ▼
 ¿Hay sesión?
  No → /login
  Sí → ¿Es admin? (consulta tabla `empresas`)
          │
          ├── Sí → Solo puede acceder a /admin
          │         Si intenta /dashboard → redirige a /admin
          │
          └── No → Solo puede acceder a /dashboard, /constructor,
                    /documentacion, /repositorio
                    Si intenta /admin → redirige a /dashboard
```

**Pantalla de carga bloqueante**: mientras se resuelven la sesión y el rol, la app muestra un spinner y **no renderiza el enrutador**, evitando flashes de contenido incorrecto o bucles de redirección.

### Capa 3: Edge Function con Service Role Key

Las operaciones privilegiadas de gestión de usuarios (crear, modificar, eliminar) nunca se ejecutan desde el cliente con la `anon key`. En su lugar, se delegan a una **Supabase Edge Function** (Deno) que:

1. Recibe la petición del panel `/admin`.
2. **Verifica el JWT** del administrador y su flag `es_admin` en la base de datos.
3. Solo si ambas comprobaciones pasan, usa la `SUPABASE_SERVICE_ROLE_KEY` para ejecutar la operación en `auth.admin`.

```
Panel Admin (React)
      │  JWT del Admin
      ▼
Edge Function: admin-users
      ├── ✅ Verifica JWT → usuario real
      ├── ✅ Verifica es_admin = true
      └── → supabaseAdmin.auth.admin.createUser(...)
               (usa Service Role Key, nunca expuesta al cliente)
```

---

## 💻 Instalación y Configuración Local

### Prerrequisitos

- [Node.js](https://nodejs.org/) `>= 20`
- [npm](https://www.npmjs.com/) `>= 10`
- Una cuenta y proyecto activo en [Supabase](https://supabase.com)

### Pasos

**1. Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/hostelegal-app.git
cd hostelegal-app
```

**2. Instalar dependencias**

```bash
npm install
```

**3. Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto con tus credenciales de Supabase:

```bash
# .env.local
VITE_SUPABASE_URL=https://<tu-proyecto-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key-publica>
```

> **⚠️ Importante:** La `SUPABASE_SERVICE_ROLE_KEY` **nunca** debe incluirse aquí. Se configura directamente como secret en el panel de Supabase para uso exclusivo de las Edge Functions.

**4. Levantar el servidor de desarrollo**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## 🚀 Despliegue en Producción

### Despliegue en Vercel (Recomendado)

El proyecto incluye un `vercel.json` preconfigurado con rewrites para el enrutamiento SPA:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Pasos:**

1. **Importar el repositorio** en [vercel.com/new](https://vercel.com/new).
2. Vercel detectará automáticamente Vite como framework.
3. En **"Environment Variables"**, añadir:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Hacer clic en **Deploy**.

### Despliegue de Edge Functions en Supabase

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Autenticarse
supabase login

# Vincular con tu proyecto remoto
supabase link --project-ref <tu-proyecto-ref>

# Desplegar la Edge Function
supabase functions deploy admin-users
```

Configura el secret de la Service Role Key desde el panel de Supabase:
**Project Settings → Edge Functions → Secrets**

---

## 🔑 Variables de Entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `VITE_SUPABASE_URL` | URL pública de tu proyecto Supabase | ✅ Sí |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase | ✅ Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio con privilegios totales | ⚙️ Solo en Edge Functions |

---

<div align="center">

**Hostelegal** — Digitalizando la hostelería, un establecimiento a la vez.

</div>
