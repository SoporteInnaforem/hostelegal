import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export function useInactivity(isActive: boolean, minutosInactividad = 30) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Si no hay sesión (isActive es false), apagamos el vigilante y no hacemos nada
        if (!isActive) return;

        const cerrarSesionPorInactividad = async () => {
            console.log("Sesión cerrada por inactividad real");
            await supabase.auth.signOut();
        };

        const reiniciarTemporizador = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(
                cerrarSesionPorInactividad,
                minutosInactividad * 60 * 1000
            );
        };

        const eventosActividad = [
            "mousemove",
            "mousedown",
            "keydown",
            "wheel",
            "touchstart",
        ];

        reiniciarTemporizador();

        eventosActividad.forEach((evento) => {
            window.addEventListener(evento, reiniciarTemporizador);
        });

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            eventosActividad.forEach((evento) => {
                window.removeEventListener(evento, reiniciarTemporizador);
            });
        };
    }, [isActive, minutosInactividad]); // Reacciona si la sesión cambia
}