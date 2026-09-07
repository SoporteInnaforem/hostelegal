import { useEffect, useRef, useState } from 'react';
import type { Dish } from '../store/useMenuStore';
import { ALLERGEN_LABEL } from '../utils/allergens';
import { downloadMenuTemplate, normalizeImportName, readMenuFile, type MenuImportResult } from '../utils/menuImport';

interface Props { isOpen: boolean; onClose: () => void; onImport: (dishes: Dish[]) => void; existingMenu: Dish[] }

export function ImportMenuModal({ isOpen, onClose, onImport, existingMenu }: Props) {
  // The inner component remounts on opening, so a previous preview is never reused.
  return isOpen ? <ImportDialog onClose={onClose} onImport={onImport} existingMenu={existingMenu} /> : null;
}

function ImportDialog({ onClose, onImport, existingMenu }: Omit<Props, 'isOpen'>) {
  const [result, setResult] = useState<MenuImportResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const request = useRef({ version: 0 });
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const session = request.current;
    dialog.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? []);
      const first = elements[0]; const last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { session.version++; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  const conflicts = result?.dishes.filter(d => existingMenu.some(e => normalizeImportName(e.name) === normalizeImportName(d.name))) ?? [];
  const canImport = result && result.dishes.length > 0 && !result.errors.length && !conflicts.length && !busy;
  const buttonClass = 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-teal-600';

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="import-menu-title" aria-describedby="import-menu-description" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-slate-800 shadow-xl sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <h2 id="import-menu-title" className="text-xl font-bold">Importar carta desde Excel</h2>
        <button type="button" onClick={onClose} className={buttonClass} aria-label="Cerrar importación">Cerrar</button>
      </div>
      <p id="import-menu-description" className="mt-3 text-sm">Descarga la plantilla, escribe una fila por ingrediente y revisa el resultado antes de añadir los platos a tu carta.</p>
      <p className="mt-2 text-sm text-slate-600">Solo .xlsx · máximo 2 MB, 2000 filas, 300 platos y 100 ingredientes por plato. Los platos existentes no se sustituyen.</p>
      <div className="my-5 flex flex-wrap items-center gap-4">
        <button type="button" className={buttonClass} disabled={busy} onClick={async () => {
          setError(''); setBusy(true);
          try { await downloadMenuTemplate(); } catch { setError('No se ha podido descargar la plantilla. Inténtalo de nuevo.'); } finally { setBusy(false); }
        }}>Descargar plantilla</button>
        <label className={`${buttonClass} cursor-pointer focus-within:outline-2 focus-within:outline-teal-600`}>
          <span>{fileName || 'Seleccionar Excel'}</span>
          <input type="file" aria-label="Seleccionar archivo Excel" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} className="sr-only" onChange={async event => {
            const file = event.target.files?.[0]; if (!file) return;
            const currentRequest = ++request.current.version;
            setResult(null); setError(''); setBusy(true); setFileName(file.name);
            try { const parsed = await readMenuFile(file, existingMenu); if (currentRequest === request.current.version) setResult(parsed); }
            catch (cause) { if (currentRequest === request.current.version) setError(cause instanceof Error ? cause.message : 'No se ha podido leer el archivo.'); }
            finally { if (currentRequest === request.current.version) setBusy(false); }
          }} />
        </label>
      </div>
      {busy && <p role="status">Procesando archivo…</p>}
      {error && <p role="alert" className="my-3 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      {result && <section aria-label="Vista previa de importación">
        <p role="status" className="font-semibold">{fileName}: {result.dishes.length} platos · {result.dishes.reduce((n, d) => n + d.ingredients.length, 0)} ingredientes</p>
        {result.pending > 0 && <p className="my-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{result.pending} {result.pending === 1 ? 'ingrediente pendiente' : 'ingredientes pendientes'} de revisar: los alérgenos estaban en blanco. Puedes importarlos, pero tendrás que revisarlos antes de publicar o generar el PDF. «Ninguno» solo indica ausencia revisada.</p>}
        {conflicts.length > 0 && <p role="alert" className="my-3 text-red-800">Estos platos ya están en la carta: {conflicts.map(d => d.name).join(', ')}. Corrige el archivo y vuelve a cargarlo.</p>}
        {result.errors.length > 0 && <div role="alert" className="my-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">Corrige {result.errors.length} errores en el Excel y vuelve a seleccionarlo. No se añadirá ningún plato hasta resolverlos.</p>
          <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5">{result.errors.map((issue, index) => <li key={index}>{issue.row > 0 ? `Fila ${issue.row}: ` : ''}{issue.message}</li>)}</ul>
        </div>}
        <div className="my-4 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
          {result.dishes.map(dish => <div key={dish.id}>
            <h3 className="font-semibold">{dish.name}</h3>
            <ul className="mt-1 space-y-1 text-sm">{dish.ingredients.map(ingredient => <li key={ingredient.id} className="flex flex-wrap justify-between gap-x-4 border-b border-slate-100 py-1">
              <span>{ingredient.name}</span><span className={ingredient.allergensReviewed ? 'text-slate-600' : 'font-medium text-amber-800'}>{!ingredient.allergensReviewed ? 'Pendiente de revisión' : ingredient.allergens.length ? ingredient.allergens.map(a => ALLERGEN_LABEL[a]).join(', ') : 'Ninguno (revisado)'}</span>
            </li>)}</ul>
          </div>)}
        </div>
      </section>}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={buttonClass}>Cancelar</button>
        <button type="button" disabled={!canImport} className={`${buttonClass} border-teal-700 bg-teal-700 text-white`} onClick={() => { if (canImport) { onImport(result.dishes); onClose(); } }}>Confirmar y añadir {result?.dishes.length ?? 0} platos</button>
      </div>
    </div>
  </div>;
}

