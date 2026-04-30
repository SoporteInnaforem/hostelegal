import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { AlertCircle, Loader2, Lock } from "lucide-react";

export function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError("Credenciales incorrectas o usuario no autorizado.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-surface-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Lock className="text-white" size={24} />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-surface-800">
                    AlergoMenú Empresas
                </h2>
                <p className="mt-2 text-center text-sm text-surface-500">
                    Acceso exclusivo para restaurantes asociados
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-surface-200">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-danger-50 text-danger-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                                <AlertCircle size={18} className="shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

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

                        <div>
                            <label className="block text-sm font-medium text-surface-700">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-surface-300 rounded-lg shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : "Iniciar Sesión"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}