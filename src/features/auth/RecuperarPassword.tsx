import { useState } from "react";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function RecuperarPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRecuperar = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                // Esto enviará al usuario a /actualizar-contrasena en el dominio donde estés ahora
                redirectTo: `${window.location.origin}/actualizar-contrasena`,
            });

            if (error) throw error;

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || "Ocurrió un error al enviar el correo.");
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
                            Recuperar contraseña
                        </h2>
                    </div>

                    {isSuccess ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <CheckCircle2 size={48} className="mx-auto text-success-500 mb-4" />
                            <p className="text-sm text-surface-600 mb-6 leading-relaxed">
                                Hemos enviado un mensaje para recuperar tu contraseña a <strong>{email}</strong>, si es correcto debería llegar en breves. Busque en Spam si no lo encuentra.
                            </p>
                            <Link to="/login" className="text-brand-600 hover:text-brand-500 font-medium text-sm">
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleRecuperar}>
                            <div>
                                <label className="block text-sm font-medium text-surface-700">
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-surface-300 rounded-lg shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-colors"
                                    placeholder="restaurante@ejemplo.com"
                                />
                            </div>

                            {error && (
                                <div className="text-sm text-danger-600 bg-danger-50 p-3 rounded-lg border border-danger-100">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Enviar instrucciones"}
                            </button>

                            <div className="text-center mt-4">
                                <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-surface-700 transition-colors">
                                    <ArrowLeft size={16} /> Volver al Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}