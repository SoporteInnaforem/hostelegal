import { useEffect, useState } from "react";
import { FileText, QrCode, LogOut, Loader2, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function Dashboard() {
    const [nombreEmpresa, setNombreEmpresa] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchEmpresa() {
            try {
                // 1. Obtener el ID del usuario logueado
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 2. Buscar su perfil en la tabla 'empresas'
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

    return (
        <div className="min-h-screen bg-surface-50">
            {/* Navbar Simple */}
            <nav className="bg-white border-b border-surface-200 px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-brand-500">AlergoMenú</h1>
                <button
                    onClick={handleLogout}
                    className="text-surface-500 hover:text-danger-600 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                    <LogOut size={16} />
                    Cerrar Sesión
                </button>
            </nav>

            {/* Contenido Principal */}
            <main className="max-w-6xl mx-auto px-6 py-12">
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

                    {/* Opción A: Documentación Normativa */}
                    <Link
                        to="/documentacion"
                        className="group bg-white rounded-2xl p-8 border border-surface-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all cursor-pointer text-left flex flex-col"
                    >
                        <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center text-surface-600 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors mb-6">
                            <FileText size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-surface-800 mb-3">Generador APPCC</h3>
                        <p className="text-surface-500 text-sm flex-1">
                            Completa el formulario interactivo para generar tu PDF de cumplimiento normativo rellenado automáticamente a partir de tu plantilla base.
                        </p>
                    </Link>

                    {/* Opción B: Constructor de Carta */}
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

                    {/* Opción C: Repositorio (NUEVA) */}
                    <Link
                        to="/repositorio"
                        className="group bg-white rounded-2xl p-8 border border-surface-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all cursor-pointer text-left flex flex-col"
                    >
                        <div className="w-14 h-14 bg-surface-100 rounded-xl flex items-center justify-center text-surface-600 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors mb-6">
                            <Download size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-surface-800 mb-3">Repositorio Normativo</h3>
                        <p className="text-surface-500 text-sm flex-1">
                            Accede y descarga al instante cartelería obligatoria, manuales de buenas prácticas y plantillas de registro para tu establecimiento.
                        </p>
                    </Link>

                </div>
            </main>
        </div>
    );
}