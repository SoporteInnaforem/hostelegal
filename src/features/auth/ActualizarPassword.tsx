import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function ActualizarPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // NUEVO: Estado para saber si el enlace es válido
    const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);

    const navigate = useNavigate();

    // NUEVO: Comprobamos la sesión al cargar la página con paciencia
    useEffect(() => {
        const checkSession = async () => {
            console.log("1. URL actual:", window.location.href);

            const { data: { session }, error } = await supabase.auth.getSession();
            console.log("2. Sesión inicial:", session ? "Hay sesión" : "No hay sesión", "| Error:", error);

            const urlTieneToken =
                window.location.hash.includes('access_token') ||
                window.location.hash.includes('type=recovery') ||
                window.location.search.includes('code');

            console.log("3. ¿La URL trae token de recuperación?", urlTieneToken);

            if (session) {
                setHasValidSession(true);
            } else if (!urlTieneToken) {
                setHasValidSession(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("4. EVENTO SUPABASE:", event, "| Sesión:", session ? "Sí" : "No");

            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
                setHasValidSession(true);
            }
            // Si la URL trae un token, ignoramos el evento SIGNED_OUT porque es un falso positivo 
            // causado por limpiar el almacenamiento antiguo.
            else if (event === "SIGNED_OUT") {
                const urlTieneToken = window.location.hash.includes('type=recovery') || window.location.search.includes('code');
                if (!urlTieneToken) {
                    setHasValidSession(false);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleActualizar = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            setIsLoading(false);
            return;
        }
        if (!/(?=.*[A-Z])/.test(password)) {
            setError("La contraseña debe contener al menos una letra mayúscula.");
            setIsLoading(false);
            return;
        }
        if (!/(?=.*\d)/.test(password)) {
            setError("La contraseña debe contener al menos un número.");
            setIsLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setIsSuccess(true);
            setTimeout(() => {
                navigate("/dashboard");
            }, 3000);

        } catch (err: any) {
            setError(err.message || "Ocurrió un error al actualizar la contraseña.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-surface-200">

                    <div className="flex flex-col items-center mb-8">
                        <h2 className="text-center text-2xl font-extrabold text-surface-800">
                            Crea tu nueva contraseña
                        </h2>
                    </div>

                    {/* MIENTRAS COMPRUEBA EL ENLACE */}
                    {hasValidSession === null ? (
                        <div className="flex justify-center py-8">
                            <Loader2 size={32} className="animate-spin text-brand-500" />
                        </div>
                    ) : hasValidSession === false ? (
                        /* SI EL ENLACE ESTÁ CADUCADO O GASTADO */
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <AlertCircle size={48} className="mx-auto text-danger-500 mb-4" />
                            <h3 className="text-lg font-medium text-surface-900 mb-2">Enlace caducado</h3>
                            <p className="text-sm text-surface-500 mb-6">
                                Este enlace de recuperación ya ha sido utilizado o ha caducado por seguridad.
                            </p>
                            <Link
                                to="/recuperar"
                                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors"
                            >
                                Solicitar nuevo enlace
                            </Link>
                        </div>
                    ) : isSuccess ? (
                        /* SI LA CONTRASEÑA SE CAMBIÓ CON ÉXITO */
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <CheckCircle2 size={48} className="mx-auto text-success-500 mb-4" />
                            <h3 className="text-lg font-medium text-surface-900 mb-2">¡Contraseña actualizada!</h3>
                            <p className="text-sm text-surface-500 mb-6">
                                Tu contraseña se ha cambiado correctamente. Redirigiendo a tu panel...
                            </p>
                        </div>
                    ) : (
                        /* FORMULARIO NORMAL */
                        <form className="space-y-6 animate-in fade-in duration-300" onSubmit={handleActualizar}>
                            <div>
                                <label className="block text-sm font-medium text-surface-700">
                                    Nueva contraseña
                                </label>
                                <div className="relative mt-1">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-2 border border-surface-300 rounded-lg shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-colors"
                                        placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-surface-700">
                                    Confirmar contraseña
                                </label>
                                <div className="relative mt-1">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-2 border border-surface-300 rounded-lg shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-colors"
                                        placeholder="Repite la contraseña"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-600 focus:outline-none"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="text-sm text-danger-600 bg-danger-50 p-3 rounded-lg border border-danger-100">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !password || !confirmPassword}
                                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Guardar y entrar"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}