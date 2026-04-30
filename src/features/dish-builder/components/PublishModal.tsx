import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { FileText, QrCode, X, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGeneratePDF: () => void;
    platos: any[]; // Sustituye "any[]" por tu tipo exacto de plato si tienes TypeScript estricto
}

export function PublishModal({ isOpen, onClose, onGeneratePDF, platos }: PublishModalProps) {
    const [isPublishing, setIsPublishing] = useState(false);
    const [publicUrl, setPublicUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleGenerateQR = async () => {
        setIsPublishing(true);
        setError(null);

        try {
            // 1. Obtener el usuario actual
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No hay sesión activa");

            // 2. Guardar en Supabase. 
            // Usamos upsert para que si ya tenía carta, se actualice la misma y el QR no cambie.
            const { data, error: dbError } = await supabase
                .from('cartas')
                .upsert(
                    {
                        empresa_id: user.id,
                        platos: platos
                    },
                    { onConflict: 'empresa_id' }
                )
                .select('id')
                .single();

            if (dbError) throw dbError;

            // 3. Crear la URL pública basada en la ID de la carta generada
            // window.location.origin pilla tu dominio automáticamente (localhost o Vercel)
            const url = `${window.location.origin}/carta/${data.id}`;
            setPublicUrl(url);

        } catch (err: any) {
            setError(err.message || "Error al generar la carta digital");
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCloseModal = () => {
        setPublicUrl(null); // Reseteamos por si vuelve a abrir
        onClose();
    };

    const downloadQR = () => {
        const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
        if (!canvas) return;
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = "QR_Alergenos.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col slide-in-from-top-1">

                {/* Cabecera */}
                <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
                    <h3 className="text-lg font-bold text-surface-800">
                        {publicUrl ? "Tu Carta Digital" : "Publicar Carta"}
                    </h3>
                    <button onClick={handleCloseModal} className="text-surface-400 hover:text-surface-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-danger-50 text-danger-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* ESTADO 1: Elegir Opción */}
                    {!publicUrl && (
                        <div className="space-y-4">
                            <p className="text-surface-500 text-sm mb-6">
                                Elige cómo quieres exportar la carta de alérgenos de tu restaurante.
                            </p>

                            <button
                                onClick={onGeneratePDF}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-surface-200 hover:border-brand-300 hover:bg-brand-50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 bg-surface-100 group-hover:bg-brand-100 rounded-lg flex items-center justify-center text-surface-600 group-hover:text-brand-500 transition-colors">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-surface-800 group-hover:text-brand-600">Descargar PDF</h4>
                                    <p className="text-xs text-surface-500">Documento físico para cumplir la normativa.</p>
                                </div>
                            </button>

                            <button
                                onClick={handleGenerateQR}
                                disabled={isPublishing}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-surface-200 hover:border-brand-300 hover:bg-brand-50 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-12 h-12 bg-surface-100 group-hover:bg-brand-100 rounded-lg flex items-center justify-center text-surface-600 group-hover:text-brand-500 transition-colors">
                                    {isPublishing ? <Loader2 size={24} className="animate-spin" /> : <QrCode size={24} />}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-surface-800 group-hover:text-brand-600">Generar QR Digital</h4>
                                    <p className="text-xs text-surface-500">Para las mesas y teléfonos móviles.</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* ESTADO 2: QR Generado */}
                    {publicUrl && (
                        <div className="flex flex-col items-center text-center animate-in fade-in">
                            <div className="bg-white p-4 rounded-xl border-2 border-surface-200 shadow-sm mb-4">
                                <QRCodeCanvas
                                    id="qr-canvas"
                                    value={publicUrl}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                            <h4 className="font-bold text-surface-800 mb-2">¡QR Listo!</h4>
                            <p className="text-sm text-surface-500 mb-6">
                                Descarga la imagen para imprimirla y ponerla en tus mesas.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={downloadQR}
                                    className="flex-1 flex justify-center items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                                >
                                    <Download size={18} />
                                    Descargar Imagen QR
                                </button>
                                <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex justify-center items-center gap-2 text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 font-medium py-2.5 px-4 rounded-lg transition-colors"
                                    title="Ver cómo queda la carta"
                                >
                                    <ExternalLink size={18} />
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}