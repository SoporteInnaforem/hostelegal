import { useRef, useState } from 'react';
import { Trash2, UtensilsCrossed, ShieldAlert } from 'lucide-react';
import { useMenuStore } from '../store/useMenuStore';
import type { Ingredient } from '../store/useMenuStore';
import { ALLERGEN_LABEL } from '../utils/allergens';
import type { AllergenId } from '../utils/allergens';
import { AllergenIcon } from './AllergenIcon';

function AllergenCell({ allergens }: { allergens: AllergenId[] }) {
  if (allergens.length === 0)
    return <span className="text-surface-400 text-xs italic">Ninguno</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {allergens.map((a) => (
        <span key={a} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-brand-500/10 text-brand-700 border border-brand-500/20">
          <AllergenIcon allergen={a} size="sm" />
          {ALLERGEN_LABEL[a]}
        </span>
      ))}
    </div>
  );
}

function DeleteButton({ ingredient }: { ingredient: Ingredient }) {
  const removeDraftIngredient = useMenuStore((s) => s.removeDraftIngredient);
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleClick() {
    if (!confirming) { setConfirming(true); timerRef.current = setTimeout(() => setConfirming(false), 2000); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    removeDraftIngredient(ingredient.id);
  }
  return (
    <button id={`delete-${ingredient.id}`} type="button" onClick={handleClick}
      aria-label={confirming ? 'Confirmar eliminación' : `Eliminar ${ingredient.name}`}
      className={['flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 outline-none',
        confirming ? 'bg-danger-600/10 text-danger-600 border border-danger-600/30' : 'bg-surface-200 text-surface-600 border border-transparent hover:bg-danger-600/10 hover:text-danger-600',
      ].join(' ')}>
      <Trash2 size={14} />
      {confirming && <span>Confirmar</span>}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-surface-400">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-100 border border-surface-300">
        <UtensilsCrossed size={24} className="opacity-50" />
      </div>
      <p className="text-sm font-medium text-surface-500">Aún no has añadido ingredientes</p>
      <p className="text-xs text-surface-400 max-w-xs text-center">Usa el buscador de arriba para añadirlos.</p>
    </div>
  );
}

export function IngredientTable() {
  const ingredients     = useMenuStore((s) => s.draftDish.ingredients);
  const globalAllergens = [...new Set(ingredients.flatMap((ing) => ing.allergens))];

  return (
    <div className="flex flex-col gap-3">
      {globalAllergens.length > 0 && (
        <div role="alert" className="flex items-start gap-3 px-4 py-3 rounded-xl bg-warning-600/10 border border-warning-600/20">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-warning-600" />
          <p className="text-xs text-warning-600 leading-relaxed">
            <span className="font-semibold">Alérgenos presentes: </span>
            {globalAllergens.map((a) => ALLERGEN_LABEL[a]).join(', ')}.
          </p>
        </div>
      )}
      <div className="rounded-xl border border-surface-300 overflow-hidden bg-white shadow-sm">
        {ingredients.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" aria-label="Ingredientes del borrador">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-100">
                  {['Ingrediente', 'Alérgenos', 'Acción'].map((col, i) => (
                    <th key={col} scope="col" className={['px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500', i === 2 ? 'text-center w-24' : 'text-left'].join(' ')}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {ingredients.map((ingredient, idx) => (
                  <tr key={ingredient.id} className={['transition-colors duration-100 hover:bg-brand-50', idx % 2 !== 0 ? 'bg-surface-50' : 'bg-white'].join(' ')}>
                    <td className="px-4 py-3 font-medium text-surface-800 whitespace-nowrap">{ingredient.name}</td>
                    <td className="px-4 py-3"><AllergenCell allergens={ingredient.allergens} /></td>
                    <td className="px-4 py-3 text-center"><DeleteButton ingredient={ingredient} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-surface-200 bg-surface-100">
                  <td className="px-4 py-2.5 text-xs text-surface-500 font-medium">
                    {ingredients.length} {ingredients.length === 1 ? 'ingrediente' : 'ingredientes'}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
