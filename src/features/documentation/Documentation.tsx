import {
  ArrowLeft,
  FileText,
  Info,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export function Documentation() {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [docsGenerados, setDocsGenerados] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false); // NUEVO ESTADO

  // Límite gratuito por empresa
  const LIMITE_DOCS = 5;

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

  // NUEVO: Escuchar cuando Tally se envía
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
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <header className="bg-white border-b border-surface-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        {/* ... (Tu cabecera se mantiene igual) ... */}
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 -ml-2 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
                <FileText size={20} />
              </div>
              <h1 className="text-xl font-bold text-surface-800">
                Plan APPCC y Autocontrol
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-brand-50 border-b border-brand-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-start gap-3 text-brand-700">
          <Info size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm mb-2">
              <strong>¿Cómo funciona?</strong> Rellena el siguiente formulario.
              Al finalizar, procesaremos la información y{" "}
              <strong>
                recibirás en tu correo el documento oficial en PDF
              </strong>
              .
            </p>
            <span className="inline-block text-xs font-bold bg-white text-brand-700 px-2 py-1 rounded-md border border-brand-200 shadow-sm">
              Documentos disponibles: {LIMITE_DOCS - docsGenerados} de{" "}
              {LIMITE_DOCS}
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col relative">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse text-surface-400 flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium">
                Cargando formulario oficial...
              </p>
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
          className="flex-1 w-full min-h-[800px] rounded-xl shadow-sm border border-surface-200 bg-white"
          onLoad={() => setIframeLoaded(true)}
          style={{
            opacity: iframeLoaded ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        ></iframe>
      </main>
    </div>
  );
}
