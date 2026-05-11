import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export function useInactivity(isActive: boolean, minutosInactividad = 30) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isActive) return;

        // 1. COMPROBACIÓN AL ABRIR LA VENTANA CERRADA
        // Al montar la app, verificamos si ya pasó el tiempo mientras estaba cerrada
        const ultimaActividad = localStorage.getItem("ultimaActividadHostelegal");
        if (ultimaActividad) {
            const tiempoInactivo = Date.now() - parseInt(ultimaActividad, 10);
            if (tiempoInactivo > minutosInactividad * 60 * 1000) {
                console.log("Sesión caducada por tener la ventana cerrada demasiado tiempo");
                supabase.auth.signOut();
                return; // Cortamos aquí para que no inicie el temporizador
            }
        }

        // 2. FUNCIÓN DE CIERRE (Cuando la ventana está abierta)
        const cerrarSesionPorInactividad = async () => {
            console.log("Sesión cerrada por inactividad con ventana abierta");
            localStorage.removeItem("ultimaActividadHostelegal"); // Limpiamos la prueba
            await supabase.auth.signOut();
        };

        // 3. REINICIAR TEMPORIZADOR Y SELLO DE TIEMPO
        const reiniciarTemporizador = () => {
            // Guardamos la hora exacta de este movimiento en la memoria del navegador
            localStorage.setItem("ultimaActividadHostelegal", Date.now().toString());
            
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

        // Arrancamos el motor
        reiniciarTemporizador();

        // Ponemos los escuchadores
        eventosActividad.forEach((evento) => {
            window.addEventListener(evento, reiniciarTemporizador);
        });

        // Limpieza al desmontar
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            eventosActividad.forEach((evento) => {
                window.removeEventListener(evento, reiniciarTemporizador);
            });
        };
    }, [isActive, minutosInactividad]);
}