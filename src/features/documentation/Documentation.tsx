import {
  ArrowLeft,
  FileText,
  Info,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

/**
 * Módulo de generación del Plan de Autocontrol Sanitario (APPCC/PASS).
 *
 * Lógica de negocio:
 * - Embebe un formulario de Tally (servicio externo) en un `<iframe>`. Tally
 *   procesa las respuestas, llama a una automatización externa (Make.com) que
 *   genera el PDF y lo envía por email al restaurante.
 * - Para detectar que el usuario ha completado el formulario dentro del iframe,
 *   se usa la API nativa `window.postMessage`. Tally emite el evento
 *   `Tally.FormSubmitted` como mensaje JSON al contexto padre.
 * - Se aplica un límite de {LIMITE_DOCS} documentos por empresa para el plan
 *   gratuito. El contador `documentos_generados` se guarda en la tabla `empresas`.
 *   Si supera el límite, se bloquea el acceso al iframe y se muestra un CTA
 *   para contactar con Hostelegal y ampliar el plan.
 * - El `empresa_id` se pasa como parámetro de query al iframe de Tally para
 *   que la automatización de Make.com pueda asociar el PDF al cliente correcto.
 */
export function Documentation() {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [docsGenerados, setDocsGenerados] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  /**
   * Número máximo de documentos APPCC que una empresa puede generar en el plan base.
   * Cambiar este valor aquí afecta tanto al bloqueo de la UI como al mensaje
   * que ve el usuario ("X de Y documentos permitidos").
   */
  const LIMITE_DOCS = 5;

  /**
   * Carga el contador de documentos generados para este usuario.
   * Se consulta directamente la tabla `empresas` (no una tabla separada de
   * documentos) para minimizar las lecturas a Supabase: un solo campo numérico
   * es más eficiente que hacer un `COUNT` sobre una tabla potencialmente grande.
   */
  useEffect(() => {
    async function checkLimit() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from("empresas")
        .select("documentos_generados")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setDocsGenerados(data.documentos_generados || 0);
      }
      setIsLoading(false);
    }
    checkLimit();
  }, []);

  /**
   * Escucha el evento `Tally.FormSubmitted` emitido por el iframe de Tally
   * para detectar cuando el usuario ha completado el formulario APPCC.
   *
   * Por qué usamos `postMessage` en lugar de un webhook directo:
   * - El iframe está en un dominio externo (tally.so), por lo que no podemos
   *   acceder a su DOM ni usar callbacks directos (cross-origin).
   * - `postMessage` es el mecanismo estándar del navegador para comunicación
   *   segura entre ventanas/iframes de distintos orígenes.
   *
   * Al detectar el envío, incrementamos `documentos_generados` directamente
   * en Supabase sin pasar por Make.com, que solo maneja la generación del PDF.
   * Esto garantiza que el contador se actualice aunque Make.com falle o tarde.
   */
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      try {
        // Tally envía los eventos como un string JSON
        const eventData = JSON.parse(e.data);

        if (eventData.event === "Tally.FormSubmitted") {
          // 1. Mostramos la pantalla de éxito
          setFormSubmitted(true);

          // 2. Sumamos 1 en Supabase nosotros mismos (Sin usar Make.com)
          if (userId) {
            await supabase
              .from("empresas")
              .update({ documentos_generados: docsGenerados + 1 })
              .eq("id", userId);
          }
        }
      } catch {
        // Ignoramos mensajes que no sean JSON válidos o no sean de Tally
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [userId, docsGenerados]);

  // Pantalla de carga inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-brand-500" />
      </div>
    );
  }

  // PANTALLA DE ÉXITO (Se muestra al enviar el formulario)
  if (formSubmitted) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-200 max-w-md w-full animate-in fade-in zoom-in duration-300">
          <CheckCircle2 size={56} className="text-success-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-surface-800 mb-2">
            ¡Formulario Enviado!
          </h2>
          <p className="text-surface-600 mb-6">
            Estamos procesando tus datos. En unos minutos recibirás tu Sistema
            de Autocontrol en formato PDF en tu correo electrónico.
          </p>
          <Link
            to="/dashboard"
            className="inline-block bg-brand-500 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-brand-600 transition-colors"
          >
            Volver al Panel
          </Link>
        </div>
      </div>
    );
  }

  // PANTALLA DE BLOQUEO: Si ha llegado a 5
  if (docsGenerados >= LIMITE_DOCS) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-200 max-w-md w-full">
          <AlertTriangle size={48} className="text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-surface-800 mb-2">
            Límite Alcanzado
          </h2>
          <p className="text-surface-600 mb-6">
            Has generado {docsGenerados} de los {LIMITE_DOCS} documentos
            permitidos.
          </p>
          <Link
            to="/dashboard"
            className="inline-block bg-brand-50 text-brand-600 font-medium px-4 py-2 rounded-lg hover:bg-brand-100 transition-colors"
          >
            Volver al Panel
          </Link>
        </div>
      </div>
    );
  }

  const tallyUrl = `https://tally.so/r/441ZRY?transparentBackground=1&empresa_id=${userId}`;

  return (
    // min-h-screen cambiado por h-screen para evitar scroll doble
    <div className="h-screen bg-surface-50 flex flex-col overflow-hidden">

      {/* 1. CABECERA SÚPER MINIMALISTA */}
      <header className="bg-white border-b border-surface-200 px-4 sm:px-6 h-16 flex-none z-20 shadow-sm flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="p-2 -ml-2 rounded-lg text-surface-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-brand-100 p-1.5 rounded-lg text-brand-600 hidden sm:block">
              <FileText size={16} />
            </div>
            {/* Ocultamos el título largo en móviles muy pequeños para dar espacio */}
            <h1 className="text-base sm:text-lg font-bold text-surface-800 truncate max-w-[150px] sm:max-w-none">
              Plan de Autocontrol Sanitario Simplificado
            </h1>
          </div>
        </div>

        {/* CONTADOR E INFO A LA DERECHA */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-surface-100 text-surface-600 px-2.5 py-1.5 rounded-lg border border-surface-200 shadow-sm whitespace-nowrap">
            {LIMITE_DOCS - docsGenerados} / {LIMITE_DOCS} <span className="hidden sm:inline">docs</span>
          </span>
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 -mr-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Ver ayuda"
          >
            <Info size={22} />
          </button>
        </div>
      </header>

      {/* 2. IFRAME A PANTALLA COMPLETA (Sin padding) */}
      <main className="flex-1 w-full relative bg-white">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="animate-pulse text-surface-400 flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Cargando formulario...</p>
            </div>
          </div>
        )}

        <iframe
          src={tallyUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          title="Sistema de Autocontrol APPCC"
          className="absolute inset-0 w-full h-full border-none z-10"
          onLoad={() => setIframeLoaded(true)}
          style={{
            opacity: iframeLoaded ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        ></iframe>
      </main>

      {/* 3. MODAL DE AYUDA (Se superpone a todo) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col slide-in-from-bottom-4">
            <div className="px-5 py-4 border-b border-surface-200 flex justify-between items-center bg-brand-50">
              <div className="flex items-center gap-2 text-brand-700">
                <Info size={20} />
                <h3 className="font-bold">¿Cómo funciona?</h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-surface-400 hover:text-surface-700 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 text-surface-600 text-sm leading-relaxed space-y-4">
              <p>
                Rellena el formulario oficial de Tally con los datos de tu establecimiento.
              </p>
              <p>
                Al finalizar, procesaremos la información y <strong>recibirás en tu correo el documento oficial en formato PDF</strong> listo para imprimir o presentar ante Sanidad.
              </p>
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full mt-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                Entendido, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
