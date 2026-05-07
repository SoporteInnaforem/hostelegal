import { useEffect, useState } from "react";
import {
    FileText,
    QrCode,
    LogOut,
    Loader2,
    Download,
    Mail,
    X,
    Send,
    CheckCircle2,
    AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import hostelegal from "../../assets/hostelegal.png";

export function Dashboard() {
    const [nombreEmpresa, setNombreEmpresa] = useState<string>("");
    const [userEmail, setUserEmail] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    // Estados para los Modales
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    // Estados para el formulario de contacto
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    useEffect(() => {
        async function fetchEmpresa() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                setUserEmail(user.email || "");

                const { data, error } = await supabase
                    .from("empresas")
                    .select("nombre_restaurante")
                    .eq("id", user.id)
                    .single();

                if (error) throw error;

                if (data && data.nombre_restaurante) {
                    setNombreEmpresa(data.nombre_restaurante);
                }
            } catch (error) {
                console.error("Error cargando el nombre de la empresa:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchEmpresa();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);

        try {
            // CAMBIO AQUÍ: 'enviar-soporte' por 'super-responder'
            const { error } = await supabase.functions.invoke('super-responder', {
                body: {
                    restaurante: nombreEmpresa,
                    email: userEmail,
                    asunto: subject,
                    mensaje: message
                }
            });

            if (error) throw error;

            setSendSuccess(true);
            setTimeout(() => {
                setIsContactModalOpen(false);
                setSendSuccess(false);
                setSubject("");
                setMessage("");
            }, 3000);

        } catch (error) {
            console.error("Error al enviar el mensaje:", error);
            alert("Hubo un error al enviar el mensaje. Inténtalo de nuevo.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface-50 flex flex-col">
            {/* Navbar unificada */}
            <nav className="bg-white border-b border-surface-200 px-4 sm:px-6 h-16 flex-none z-20 shadow-sm flex items-center justify-between sticky top-0">                <img src={hostelegal} alt="Hostelegal App" className="h-8 w-auto" />

                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={() => setIsContactModalOpen(true)}
                        className="text-surface-500 hover:text-brand-600 p-2 sm:px-3 sm:py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <Mail size={18} />
                        <span className="hidden sm:inline">Soporte</span>
                    </button>

                    <div className="w-px h-6 bg-surface-200 hidden sm:block"></div>

                    <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        className="text-surface-500 hover:text-danger-600 p-2 sm:px-3 sm:py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Cerrar Sesión</span>
                    </button>
                </div>
            </nav>

            {/* Contenido Principal */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
                <h2 className="text-3xl font-extrabold text-surface-800 mb-2 flex items-center gap-3">
                    {isLoading ? (
                        <>
                            Cargando perfil <Loader2 size={24} className="animate-spin text-brand-500" />
                        </>
                    ) : (
                        `Bienvenido, ${nombreEmpresa || "a tu Panel"}`
                    )}
                </h2>
                <p className="text-surface-500 mb-10">Selecciona la herramienta que deseas utilizar hoy.</p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Generador APPCC */}
                    <Link
                        to="/documentacion"
                        className="group bg-white rounded-2xl p-8 border border-surface-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all cursor-pointer text-left flex flex-col"
                    >
                        <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center text-surface-600 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors mb-6">
                            <FileText size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-surface-800 mb-3">Plan de Autocontrol Sanitario</h3>
                        <p className="text-surface-500 text-sm flex-1">
                            Completa el formulario interactivo para generar tu PDF de Plan de Autocontrol Sanitario Simplificado rellenado automáticamente.
                        </p>
                    </Link>

                    {/* Constructor de Carta */}
                    <Link
                        to="/constructor"
                        className="group bg-white rounded-2xl p-8 border border-surface-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all cursor-pointer text-left flex flex-col"
                    >
                        <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center text-surface-600 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors mb-6">
                            <QrCode size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-surface-800 mb-3">Carta de Alérgenos Digital</h3>
                        <p className="text-surface-500 text-sm flex-1">
                            Diseña tu carta plato a plato, exporta el PDF para las mesas y genera un código QR para que tus clientes lo escaneen desde sus móviles.
                        </p>
                    </Link>

                    {/* Repositorio */}
                    <Link
                        to="/repositorio"
                        className="group bg-white rounded-2xl p-8 border border-surface-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all cursor-pointer text-left flex flex-col"
                    >
                        <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center text-surface-600 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors mb-6">
                            <Download size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-surface-800 mb-3">Documentación</h3>
                        <p className="text-surface-500 text-sm flex-1">
                            Accede y descarga al instante cartelería obligatoria, manuales de buenas prácticas y plantillas de registro para tu establecimiento.
                        </p>
                    </Link>
                </div>
            </main>

            {/* --- MODAL CERRAR SESIÓN --- */}
            {isLogoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col slide-in-from-bottom-4">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-danger-50 text-danger-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-surface-800 mb-2">¿Cerrar sesión?</h3>
                            <p className="text-surface-500 text-sm">
                                Tendrás que volver a introducir tus credenciales para acceder a tu panel.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setIsLogoutModalOpen(false)}
                                className="flex-1 bg-surface-100 hover:bg-surface-200 text-surface-700 font-medium py-2.5 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 bg-danger-600 hover:bg-danger-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                            >
                                Sí, cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL CONTACTO --- */}
            {isContactModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col slide-in-from-bottom-4">

                        <div className="px-5 py-4 border-b border-surface-200 flex justify-between items-center bg-brand-50">
                            <div className="flex items-center gap-2 text-brand-700">
                                <Mail size={20} />
                                <h3 className="font-bold">Contactar con Soporte</h3>
                            </div>
                            <button
                                onClick={() => !isSending && setIsContactModalOpen(false)}
                                className="text-surface-400 hover:text-surface-700 transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {sendSuccess ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center animate-in zoom-in duration-300">
                                <CheckCircle2 size={56} className="text-success-500 mb-4" />
                                <h3 className="text-xl font-bold text-surface-800 mb-2">¡Mensaje Enviado!</h3>
                                <p className="text-surface-500 text-sm">Hemos recibido tu consulta y te responderemos pronto a <strong>{userEmail}</strong>.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSendMessage} className="p-5 flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1.5">
                                        Asunto
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Ej: Duda sobre alérgenos, problema con el menú..."
                                        className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1.5">
                                        Mensaje
                                    </label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Escribe aquí tu consulta..."
                                        className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                                    ></textarea>
                                </div>

                                <div className="mt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSending || !subject.trim() || !message.trim()}
                                        className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 px-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        {isSending ? "Enviando..." : "Enviar mensaje"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}