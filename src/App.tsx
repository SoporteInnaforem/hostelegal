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

// Pantalla anti-curiosos
const Pantalla404 = () => (
  <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="bg-white p-10 rounded-3xl shadow-sm border border-surface-200 max-w-md w-full animate-in zoom-in duration-300">
      <h2 className="text-6xl font-black text-brand-500 mb-4">404</h2>
      <h3 className="text-xl font-bold text-surface-800 mb-2">¡Ups, te has perdido!</h3>
      <p className="text-surface-600">
        La página que buscas no existe o no está disponible en esta dirección.
      </p>
    </div>
  </div>
);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useInactivity(!!session, 30);

  useEffect(() => {
    let isMounted = true;

    const fetchRoleAndSetSession = async (currentSession: Session | null) => {
      if (!currentSession) {
        if (isMounted) {
          setSession(null);
          setIsAdmin(false);
          setIsExpired(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('es_admin, fecha_caducidad_suscripcion')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          setIsAdmin(!!data?.es_admin);

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
          setIsExpired(true);
          setSession(currentSession);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchRoleAndSetSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === "SIGNED_OUT") {
        // 1. Limpiamos el reloj al cerrar sesión
        localStorage.removeItem("ultimaActividadHostelegal");

        if (isMounted) {
          setSession(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
      } else if (event === "SIGNED_IN") {
        // 2. Reiniciamos el reloj al hacer login para que entre "fresco"
        localStorage.setItem("ultimaActividadHostelegal", Date.now().toString());

        if (isMounted) setIsLoading(true);
        fetchRoleAndSetSession(currentSession);
      } else if (currentSession) {
        if (isMounted) setSession(currentSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Aduana visual
  if (isLoading || (session && isAdmin === null) || (session && !isAdmin && isExpired === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 text-brand-500">
        <Loader2 size={40} className="animate-spin" />
      </div>
    );
  }

  // --- LÓGICA DE DOMINIOS ---
  const hostname = window.location.hostname;
  const isPublicDomain = hostname.includes("cartas-") || hostname.includes("menu.");

  // SI ES EL DOMINIO PÚBLICO
  if (isPublicDomain) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/carta/:id" element={<PublicMenu />} />
          <Route path="*" element={<Pantalla404 />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // SI ES EL DOMINIO PRIVADO
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!session ? <Navigate to="/login" replace /> : (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />)} />
        <Route path="/login" element={!session ? <Login /> : (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />)} />
        <Route path="/admin" element={session ? (isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" replace />) : <Navigate to="/login" replace />} />

        <Route path="/dashboard" element={session ? (!isAdmin ? <Dashboard /> : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />} />
        <Route path="/constructor" element={session ? (!isAdmin ? (!isExpired ? <MenuBuilder /> : <Navigate to="/dashboard" replace />) : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />} />
        <Route path="/documentacion" element={session ? (!isAdmin ? (!isExpired ? <Documentation /> : <Navigate to="/dashboard" replace />) : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />} />
        <Route path="/repositorio" element={session ? (!isAdmin ? (!isExpired ? <Repository /> : <Navigate to="/dashboard" replace />) : <Navigate to="/admin" replace />) : <Navigate to="/login" replace />} />

        <Route path="/carta/:id" element={<PublicMenu />} />

        <Route path="/recuperar" element={<RecuperarPassword />} />
        <Route path="/actualizar-contrasena" element={<ActualizarPassword />} />

        <Route path="*" element={<Pantalla404 />} />
      </Routes>
    </BrowserRouter>
  );
}