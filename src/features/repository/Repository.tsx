import { useState, useEffect } from "react";
import { ArrowLeft, Download, FileText, File, FileImage, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const GOOGLE_API_KEY = "AIzaSyDmrqKmgjDD1uJlu1W0wYtRVshH1Z198Mo";
const DRIVE_FOLDER_ID = "11YSrHAiIQbEyvMxQiZsmX49u5B2Dc_wQ";

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    // 1. CAMBIO: Usamos webContentLink en lugar de webViewLink para descarga directa
    webContentLink: string;
}

export function Repository() {
    const [archivos, setArchivos] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDriveFiles() {
            try {
                // 2. CAMBIO: En los fields de la URL pedimos 'webContentLink'
                const url = `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webContentLink)&key=${GOOGLE_API_KEY}`;

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error("No se pudo conectar con el repositorio.");
                }

                const data = await response.json();

                const filesOnly = data.files.filter((f: DriveFile) => f.mimeType !== "application/vnd.google-apps.folder");

                setArchivos(filesOnly);
            } catch (err: any) {
                console.error(err);
                setError("Error al cargar los documentos. Vuelve a intentarlo más tarde.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchDriveFiles();
    }, []);

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes("pdf")) return <FileText size={24} />;
        if (mimeType.includes("image")) return <FileImage size={24} />;
        return <File size={24} />;
    };

    return (
        <div className="min-h-screen bg-surface-50 flex flex-col">
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
                            <Download size={16} />
                        </div>
                        <h1 className="text-base sm:text-lg font-bold text-surface-800">
                            Documentación
                        </h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-surface-800 mb-2">Documentación de Interés</h2>
                    <p className="text-surface-500">
                        Descarga material oficial, cartelería y guías útiles para mantener tu establecimiento al día con la normativa vigente.
                    </p>
                </div>

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-brand-500">
                        <Loader2 size={40} className="animate-spin mb-4" />
                        <p className="font-medium text-surface-600 animate-pulse">Sincronizando con la nube...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-danger-50 text-danger-600 p-6 rounded-2xl flex flex-col items-center text-center border border-danger-100">
                        <AlertCircle size={40} className="mb-3 opacity-80" />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {!isLoading && !error && archivos.length === 0 && (
                    <div className="text-center py-20 text-surface-500">
                        <p>No hay documentos disponibles en este momento.</p>
                    </div>
                )}

                {!isLoading && !error && archivos.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {archivos.map((doc) => (
                            <div
                                key={doc.id}
                                className="bg-white rounded-2xl p-5 border border-surface-200 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                            >
                                <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4 shrink-0">
                                    {getFileIcon(doc.mimeType)}
                                </div>

                                {/* 3. CAMBIO: Añadido break-all y line-clamp para que textos sin espacios no rompan el grid */}
                                <h3
                                    className="font-bold text-surface-800 mb-4 leading-tight break-all line-clamp-2"
                                    title={doc.name} // Al pasar el ratón se verá el nombre completo
                                >
                                    {doc.name.replace(/\.[^/.]+$/, "")}
                                </h3>

                                <div className="mt-auto">
                                    <a
                                        href={doc.webContentLink} // 4. CAMBIO: Enlace de descarga directa
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-surface-100 hover:bg-brand-50 text-surface-700 hover:text-brand-700 rounded-xl font-medium text-sm transition-colors"
                                    >
                                        <Download size={16} />
                                        Descargar
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}