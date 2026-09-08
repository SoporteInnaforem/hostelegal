import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loader2, ChefHat, AlertCircle } from "lucide-react";
import { AllergenIcon } from "../dish-builder/components/AllergenIcon";
import type { Dish } from "../dish-builder/store/useMenuStore";
import { parseStoredMenu } from "../dish-builder/utils/menuValidation";
import { groupMenuBySection } from "../dish-builder/utils/menuSections";

function PublicDishCard({ dish, nested }: { dish: Dish; nested: boolean }) {
    const allergens = [...new Set([...(dish.dishAllergens ?? []), ...dish.ingredients.flatMap(ingredient => ingredient.allergens)])];
    const ingredients = dish.ingredients.filter(ingredient => !ingredient.isDishSummary);
    const titleClass = "text-lg font-bold text-surface-800 leading-tight mb-2";
    return <article className="bg-white rounded-2xl p-5 shadow-sm border border-surface-200">
        {nested ? <h3 className={titleClass}>{dish.name}</h3> : <h2 className={titleClass}>{dish.name}</h2>}
        {ingredients.length > 0 && <p className="text-sm text-surface-600 mb-4 leading-relaxed"><span className="font-semibold text-surface-800">Ingredientes:</span> {ingredients.map(ingredient => ingredient.name).join(', ')}.</p>}
        {allergens.length > 0 && <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Alérgenos detectados:</p>
            <div className="flex flex-wrap gap-2">{allergens.map(allergen => <div key={allergen} className="flex items-center gap-1.5 bg-white border border-surface-200 px-2 py-1 rounded-md shadow-sm">
                <AllergenIcon allergen={allergen} size="sm" />
                <span className="text-xs font-medium text-surface-700 capitalize">{allergen.toLowerCase().replace(/_/g, ' ')}</span>
            </div>)}</div>
        </div>}
    </article>;
}

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
     * La consulta usa una RPC pública que devuelve únicamente la versión
     * publicada; los borradores y la tabla subyacente no son públicos.
     *
     * Prioridad del nombre mostrado en cabecera:
     * 1. `nombre_carta` (nombre personalizado de esta carta concreta).
     * 2. `empresa.nombre_restaurante` (nombre genérico del perfil del local).
     * 3. "Carta de Alérgenos" como fallback si ningún dato está disponible.
     *
     */
    useEffect(() => {
        let active = true;
        async function cargarCarta() {
            if (!id) return;
            setIsLoading(true);
            setError(null);

            try {
                // 1. Buscamos la carta en Supabase usando la ID de la URL
                const { data, error: dbError } = await supabase
                    .rpc('obtener_carta_publica', { p_id: id }).maybeSingle<{ platos: unknown; nombre_carta: string | null }>();
                if (dbError || !data) throw dbError || new Error('Carta no disponible');
                if (!active) return;
                setPlatos(parseStoredMenu(data.platos));
                setNombreRestaurante(data.nombre_carta || "Carta de Alérgenos");

            } catch (err) {
                console.error("Error cargando carta:", err);
                if (active) setError("No hemos podido cargar esta carta. Es posible que el enlace haya caducado o sea incorrecto.");
            } finally {
                if (active) setIsLoading(false);
            }
        }

        void cargarCarta();
        return () => { active = false; };
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

    const sectionGroups = groupMenuBySection(platos);
    const usesSections = sectionGroups.length > 1 || sectionGroups[0]?.name !== null;

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
                {sectionGroups.map(group => <section key={group.key || 'unsectioned'} aria-label={group.name ?? 'Otros'} className="flex flex-col gap-4">
                    {usesSections && <h2 className="mt-3 border-b border-brand-200 pb-2 text-xl font-bold text-brand-700">{group.name ?? 'Otros'}</h2>}
                    {group.dishes.map(dish => <PublicDishCard key={dish.id} dish={dish} nested={usesSections} />)}
                </section>)}
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
