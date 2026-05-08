import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loader2, ChefHat, AlertCircle } from "lucide-react";
import { AllergenIcon } from "../dish-builder/components/AllergenIcon";
import type { Dish } from "../dish-builder/store/useMenuStore";

/**
 * Vista pública de la carta de alérgenos. Accesible sin autenticación.
 *
 * Lógica de negocio:
 * - La ruta es `/carta/:id` donde `:id` es el UUID de la carta almacenada en
 *   Supabase. Este UUID se codifica en el QR que genera el restaurante desde
 *   el constructor, por lo que un QR impreso siempre apunta a los datos
 *   más actualizados en tiempo real.
 * - La prioridad del nombre mostrado en la cabecera es: `nombre_carta` (si el
 *   restaurante personalizó el nombre) > `nombre_restaurante` (del perfil de
 *   empresa) > texto por defecto. Esto permite cartas con nombres distintos
 *   al nombre del local (e.g. "Carta de Verano", "Menú Infantil").
 * - La información de alérgenos se muestra según el Reglamento (UE) nº 1169/2011
 *   que obliga a los establecimientos a informar sobre los 14 alérgenos
 *   principales. El componente agrupa y deduplica alérgenos a nivel de plato,
 *   mostrando solo los únicos aunque varios ingredientes los contengan.
 */
export function PublicMenu() {
    const { id } = useParams();
    const [platos, setPlatos] = useState<Dish[]>([]);
    const [nombreRestaurante, setNombreRestaurante] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Recupera la carta de alérgenos desde Supabase usando el ID de la URL.
     *
     * La consulta hace un JOIN implícito con `empresas` para obtener el nombre
     * del restaurante en una sola petición, evitando un segundo round-trip.
     *
     * Prioridad del nombre mostrado en cabecera:
     * 1. `nombre_carta` (nombre personalizado de esta carta concreta).
     * 2. `empresa.nombre_restaurante` (nombre genérico del perfil del local).
     * 3. "Carta de Alérgenos" como fallback si ningún dato está disponible.
     *
     * El `Array.isArray` en `data.empresas` maneja la ambigüedad del tipo
     * devuelto por Supabase en JOINs: puede ser un objeto o un array según
     * cómo el cliente JS infiera la cardinalidad de la relación.
     */
    useEffect(() => {
        async function cargarCarta() {
            if (!id) return;

            try {
                // 1. Buscamos la carta en Supabase usando la ID de la URL
                const { data, error: dbError } = await supabase
                    .from("cartas")
                    .select(`
            platos,
            actualizado_en,
            nombre_carta,
            empresas (
              nombre_restaurante
            )
          `)
                    .eq("id", id)
                    .single();

                if (dbError) throw dbError;

                // 2. Guardamos los datos en el estado local
                setPlatos(data.platos);
                const empresa = Array.isArray(data.empresas) ? data.empresas[0] : data.empresas;

                // 3. LA MAGIA DE LA PRIORIDAD: Primero el nombre de la carta, luego el de la empresa.
                setNombreRestaurante(data.nombre_carta || empresa?.nombre_restaurante || "Carta de Alérgenos");

            } catch (err) {
                console.error("Error cargando carta:", err);
                setError("No hemos podido cargar esta carta. Es posible que el enlace haya caducado o sea incorrecto.");
            } finally {
                setIsLoading(false);
            }
        }

        cargarCarta();
    }, [id]);

    // Pantalla de Carga
    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 text-brand-500">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="font-medium text-surface-600 animate-pulse">Cargando carta...</p>
            </div>
        );
    }

    // Pantalla de Error (ej. QR antiguo o borrado)
    if (error || platos.length === 0) {
        return (
            <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-200 max-w-md w-full">
                    <AlertCircle size={48} className="text-danger-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-surface-800 mb-2">Carta no disponible</h2>
                    <p className="text-surface-600">{error || "Esta carta no tiene platos actualmente."}</p>
                </div>
            </div>
        );
    }

    // LA CARTA DIGITAL (Diseño optimizado para móviles)
    return (
        <div className="min-h-screen bg-surface-100 pb-20">
            {/* Cabecera pegajosa */}
            <header className="bg-brand-500 text-white sticky top-0 z-10 shadow-md">
                <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col items-center text-center">
                    <div className="bg-white/20 p-2 rounded-full mb-2">
                        <ChefHat size={24} className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">{nombreRestaurante}</h1>
                    <p className="text-brand-100 text-xs mt-1 font-medium tracking-wider uppercase">
                        Información de Alérgenos
                    </p>
                </div>
            </header>

            {/* Lista de Platos */}
            <main className="max-w-3xl mx-auto px-4 mt-6 flex flex-col gap-4">
                {platos.map((plato, index) => {
                    /**
                     * Deduplica los alérgenos de todos los ingredientes del plato.
                     * Usamos `Set` para eliminar repeticiones: si "mayonesa" y "pan"
                     * ambos contienen GLUTEN, el comensal ve GLUTEN solo una vez.
                     * Esto cumple el requisito del Reglamento UE 1169/2011 de
                     * informar sobre PRESENCIA, no sobre cantidad ni fuente.
                     */
                    const alergenosUnicos = [
                        ...new Set(plato.ingredients.flatMap((i) => i.allergens)),
                    ];

                    // Formateamos los ingredientes en una lista separada por comas
                    const listaIngredientes = plato.ingredients.map(i => i.name).join(", ");

                    return (
                        <article
                            key={plato.id || index}
                            className="bg-white rounded-2xl p-5 shadow-sm border border-surface-200"
                        >
                            <h2 className="text-lg font-bold text-surface-800 leading-tight mb-2">
                                {plato.name}
                            </h2>

                            {/* INGREDIENTES: Nuevo bloque añadido aquí */}
                            {plato.ingredients.length > 0 && (
                                <p className="text-sm text-surface-600 mb-4 leading-relaxed">
                                    <span className="font-semibold text-surface-800">Ingredientes:</span> {listaIngredientes}.
                                </p>
                            )}

                            <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                                    Alérgenos detectados:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {alergenosUnicos.length === 0 ? (
                                        <span className="text-sm text-success-600 font-medium bg-success-50 px-2 py-1 rounded-md">
                                            ✓ Libre de los 14 alérgenos principales
                                        </span>
                                    ) : (
                                        alergenosUnicos.map((alergeno) => (
                                            <div key={alergeno} className="flex items-center gap-1.5 bg-white border border-surface-200 px-2 py-1 rounded-md shadow-sm">
                                                <AllergenIcon allergen={alergeno} size="sm" />
                                                <span className="text-xs font-medium text-surface-700 capitalize">
                                                    {alergeno.toLowerCase().replace(/_/g, " ")}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </article>
                    );
                })}
            </main>

            {/* Pie de página legal */}
            <footer className="max-w-3xl mx-auto px-4 mt-12 text-center">
                <p className="text-xs text-surface-400 max-w-sm mx-auto">
                    Información proporcionada según el Reglamento (UE) nº 1169/2011. Si tiene alergias severas, consulte siempre con el personal del establecimiento.
                </p>
            </footer>
        </div>
    );
}