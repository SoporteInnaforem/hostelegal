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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState<boolean | null>(null); // <-- 1. NUEVO ESTADO
  const [isLoading, setIsLoading] = useState(true);

  useInactivity(!!session, 30);

  useEffect(() => {
    let isMounted = true;

    const fetchRoleAndSetSession = async (currentSession: Session | null) => {
      if (!currentSession) {
        if (isMounted) {
          setSession(null);
          setIsAdmin(false);
          setIsExpired(false); // Limpiamos por si acaso
          setIsLoading(false);
        }
        return;
      }

      try {
        // 2. PEDIMOS LA FECHA JUNTO CON EL ROL
        const { data, error } = await supabase
          .from('empresas')
          .select('es_admin, fecha_caducidad_suscripcion')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          setIsAdmin(!!data?.es_admin);

          // 3. CALCULAMOS SI ESTÁ CADUCADO (Solo a los clientes normales)
          if (data && !data.es_admin) {
            const caducado = new Date(data.fecha_caducidad_suscripcion) < new Date();
            setIsExpired(caducado);
          } else {
            setIsExpired(false);
          }

          setSession(currentSession);
        }
      } catch (error) {
        console.error("Error de conexión al verificar el rol:", error);
        if (isMounted) {
          setIsAdmin(false);
          setIsExpired(true); // Ante un error raro, lo bloqueamos por seguridad
          setSession(currentSession);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
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
  if (isLoading || (session && isAdmin === null) || (session && !isAdmin && isExpired === null)) {
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

        {/* Rutas de Clientes Normales */}
        {/* Al Dashboard siempre les dejamos entrar, porque ahí es donde tienes tu mensaje de bloqueo */}
        <Route
          path="/dashboard"
          element={
            session ? (!isAdmin ? <Dashboard /> : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />
          }
        />

        {/* A estas 3 rutas NO les dejamos entrar si están caducados (isExpired) */}
        <Route
          path="/constructor"
          element={
            session ? (!isAdmin ? (!isExpired ? <MenuBuilder /> : <Navigate to="/dashboard" replace />) : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/documentacion"
          element={
            session ? (!isAdmin ? (!isExpired ? <Documentation /> : <Navigate to="/dashboard" replace />) : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/repositorio"
          element={
            session ? (!isAdmin ? (!isExpired ? <Repository /> : <Navigate to="/dashboard" replace />) : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />
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