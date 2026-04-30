import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";

// Páginas importadas con la arquitectura Feature-Sliced Design
import { Login } from "./features/auth/Login";
import { Dashboard } from "./features/dashboard/Dashboard";
import { MenuBuilder } from "./features/dish-builder/MenuBuilder";
import { PublicMenu } from "./features/public-menu/PublicMenu";
import { Loader2 } from "lucide-react";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Comprobar la sesión actual al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // 2. Escuchar cambios (cuando el usuario hace login o logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Pantalla de carga mientras comprobamos si hay sesión guardada en el navegador
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 text-brand-500">
        <Loader2 size={40} className="animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta base: Si hay sesión va al Dashboard, si no, al Login */}
        <Route
          path="/"
          element={
            session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          }
        />

        {/* Ruta de Login: Bloqueada si YA tienes sesión */}
        <Route
          path="/login"
          element={
            !session ? <Login /> : <Navigate to="/dashboard" replace />
          }
        />

        {/* Ruta Dashboard: Bloqueada si NO tienes sesión */}
        <Route
          path="/dashboard"
          element={
            session ? <Dashboard /> : <Navigate to="/login" replace />
          }
        />

        {/* Ruta Constructor: Bloqueada si NO tienes sesión */}
        <Route
          path="/constructor"
          element={
            session ? <MenuBuilder /> : <Navigate to="/login" replace />
          }
        />

        {/* Ruta Pública de la Carta (Para los clientes del restaurante) */}
        <Route path="/carta/:id" element={<PublicMenu />} />

        {/* Ruta por defecto (404) redirige al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />

        {/* Ruta por defecto (404) redirige al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}