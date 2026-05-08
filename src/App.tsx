import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";

// Páginas importadas con la arquitectura Feature-Sliced Design
import { Login } from "./features/auth/Login";
import { Dashboard } from "./features/dashboard/Dashboard";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { MenuBuilder } from "./features/dish-builder/MenuBuilder";
import { PublicMenu } from "./features/public-menu/PublicMenu";
import { Documentation } from "./features/documentation/Documentation";
import { Repository } from "./features/repository/Repository";
import { RecuperarPassword } from "./features/auth/RecuperarPassword";
import { ActualizarPassword } from "./features/auth/ActualizarPassword";
import { Loader2 } from "lucide-react";

// Hook de inactividad
import { useInactivity } from "./hooks/useInactivity";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  // Inicializamos en null. Si hay sesión pero esto es null, significa que estamos comprobando tu rango.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // El vigilante solo se enciende si hay una sesión activa.
  useInactivity(!!session, 30);

  useEffect(() => {
    let isMounted = true;

    // Función blindada: Pase lo que pase, siempre quita la pantalla de carga al terminar
    const fetchRoleAndSetSession = async (currentSession: Session | null) => {
      if (!currentSession) {
        if (isMounted) {
          setSession(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('es_admin')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          setIsAdmin(!!data?.es_admin);
          setSession(currentSession);
        }
      } catch (error) {
        console.error("Error de conexión al verificar el rol:", error);
        if (isMounted) {
          setIsAdmin(false); // Ante la duda o fallo, denegamos el acceso de admin
          setSession(currentSession);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false); // <- LA GARANTÍA: Siempre dejará de girar
        }
      }
    };

    // 1. Al cargar la app o recargar la URL a mano
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchRoleAndSetSession(session);
    });

    // 2. Al iniciar sesión o cerrar sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === "SIGNED_OUT") {
        if (isMounted) {
          setSession(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
      } else if (event === "SIGNED_IN") {
        if (isMounted) setIsLoading(true);
        fetchRoleAndSetSession(currentSession);
      } else if (currentSession) {
        // Otros eventos de fondo (como refresco de seguridad del token)
        if (isMounted) setSession(currentSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Aduana visual: Evita que el enrutador empiece a redirigir a lo loco antes de tiempo
  if (isLoading || (session && isAdmin === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 text-brand-500">
        <Loader2 size={40} className="animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Base */}
        <Route
          path="/"
          element={
            !session ? <Navigate to="/login" replace /> :
              (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />)
          }
        />

        {/* Ruta Login */}
        <Route
          path="/login"
          element={
            !session ? <Login /> :
              (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />)
          }
        />

        {/* Ruta Admin Exclusiva: Rebota a los clientes normales de vuelta al dashboard */}
        <Route
          path="/admin"
          element={
            session ? (isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" replace />) : <Navigate to="/login" replace />
          }
        />

        {/* Rutas de Clientes Normales: Rebota al Administrador de vuelta a su panel */}
        <Route
          path="/dashboard"
          element={
            session ? (!isAdmin ? <Dashboard /> : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/constructor"
          element={
            session ? (!isAdmin ? <MenuBuilder /> : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/documentacion"
          element={
            session ? (!isAdmin ? <Documentation /> : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/repositorio"
          element={
            session ? (!isAdmin ? <Repository /> : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />
          }
        />

        {/* Rutas Públicas de Auth */}
        <Route path="/recuperar" element={<RecuperarPassword />} />
        <Route path="/actualizar-contrasena" element={<ActualizarPassword />} />

        {/* Ruta Pública de la Carta */}
        <Route path="/carta/:id" element={<PublicMenu />} />

        {/* Ruta por defecto (404) redirige al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}