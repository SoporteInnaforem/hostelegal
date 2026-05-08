import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, ChefHat, Loader2 } from 'lucide-react';
import { useDishStore } from './store/useDishStore';
import { IngredientSearch } from './components/IngredientSearch';
import { IngredientTable } from './components/IngredientTable';

// ─── Allergen label map (mirrors IngredientTable) ─────────────────────────────

const ALLERGEN_LABEL: Record<string, string> = {
  GLUTEN: 'Gluten',
  CRUSTACEOS: 'Crustáceos',
  HUEVOS: 'Huevos',
  PESCADO: 'Pescado',
  CACAHUETES: 'Cacahuetes',
  SOJA: 'Soja',
  LACTEOS: 'Lácteos',
  FRUTOS_DE_CASCARA: 'Frutos de cáscara',
  APIO: 'Apio',
  MOSTAZA: 'Mostaza',
  SESAMO: 'Sésamo',
  SULFITOS: 'Sulfitos',
  ALTRAMUCES: 'Altramuces',
  MOLUSCOS: 'Moluscos',
};

// ─── PDF export ───────────────────────────────────────────────────────────────

function exportPDF(dishName: string, ingredients: ReturnType<typeof useDishStore.getState>['ingredients']) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(124, 28, 212); // brand-600 approx
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('Hostelegal — Ficha Técnica', 14, 14);

  // ── Dish title ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 28, 54); // surface-800 approx
  const title = dishName.trim() || 'Plato sin nombre';
  doc.text(title, 14, 36);

  // Underline
  doc.setDrawColor(124, 28, 212);
  doc.setLineWidth(0.6);
  doc.line(14, 38.5, pageW - 14, 38.5);

  // ── Metadata line ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(113, 110, 150); // surface-500 approx
  doc.text(`Generado el ${now} · ${ingredients.length} ingrediente(s)`, 14, 45);

  // ── Table ────────────────────────────────────────────────────────────────────
  const rows = ingredients.map((ing) => [
    ing.name,
    String(ing.quantity),
    ing.allergens.length > 0
      ? ing.allergens.map((a) => ALLERGEN_LABEL[a] ?? a).join(', ')
      : '—',
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['Ingrediente', 'Cantidad', 'Alérgenos']],
    body: rows,
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
      lineColor: [226, 224, 237],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [124, 28, 212],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 248, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'center', cellWidth: 25 },
      2: { cellWidth: 'auto', textColor: [180, 100, 20] },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 200);
  doc.text('Documento generado automáticamente por Hostelegal.', 14, pageH - 10);
  doc.text(`Página 1`, pageW - 14, pageH - 10, { align: 'right' });

  // ── Save ─────────────────────────────────────────────────────────────────────
  const safeTitle = title.replace(/[^a-z0-9áéíóúñ\s-]/gi, '').trim().replace(/\s+/g, '_');
  doc.save(`ficha_${safeTitle || 'plato'}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DishBuilder() {
  const dishName = useDishStore((s) => s.dishName);
  const setDishName = useDishStore((s) => s.setDishName);
  const ingredients = useDishStore((s) => s.ingredients);
  const resetDish = useDishStore((s) => s.resetDish);

  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    // Tiny async tick so the spinner has a chance to render
    await new Promise((r) => setTimeout(r, 60));
    try {
      exportPDF(dishName, ingredients);
    } finally {
      setIsExporting(false);
    }
  }

  const canExport = ingredients.length > 0;

  return (
    <div className="min-h-screen bg-surface-900 py-10 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={[
                'flex items-center justify-center w-10 h-10 rounded-xl',
                'bg-brand-500/15 border border-brand-500/30',
              ].join(' ')}
            >
              <ChefHat size={20} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-surface-50 leading-tight">
                Constructor de Plato
              </h1>
              <p className="text-xs text-surface-500 mt-0.5">
                Hostelegal · Ficha Técnica
              </p>
            </div>
          </div>

          {/* Reset */}
          <button
            type="button"
            id="reset-dish-btn"
            onClick={resetDish}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium',
              'text-surface-400 border border-surface-700',
              'hover:border-surface-500 hover:text-surface-300',
              'transition-colors duration-150 outline-none',
              'focus-visible:ring-2 focus-visible:ring-surface-500',
            ].join(' ')}
          >
            Limpiar todo
          </button>
        </header>

        {/* ── Dish name ─────────────────────────────────────────────────────── */}
        <section aria-labelledby="dish-name-label">
          <label
            id="dish-name-label"
            htmlFor="dish-name-input"
            className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2"
          >
            Nombre del plato
          </label>
          <input
            id="dish-name-input"
            type="text"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            placeholder="Ej: Ensalada de gambas con aguacate…"
            maxLength={120}
            className={[
              'w-full px-5 py-4 rounded-2xl',
              'bg-surface-800 border border-surface-600',
              'text-surface-50 text-lg font-medium placeholder:text-surface-600',
              'outline-none transition-all duration-200',
              'hover:border-surface-400',
              'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:shadow-lg focus:shadow-brand-500/10',
            ].join(' ')}
          />
          {/* Character counter */}
          <div className="flex justify-end mt-1">
            <span
              className={[
                'text-[11px] tabular-nums transition-colors',
                dishName.length > 100 ? 'text-warning-400' : 'text-surface-600',
              ].join(' ')}
            >
              {dishName.length}/120
            </span>
          </div>
        </section>

        {/* ── Ingredient search ─────────────────────────────────────────────── */}
        <section aria-labelledby="ingredient-search-label">
          <label
            id="ingredient-search-label"
            className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2"
          >
            Añadir ingrediente
          </label>
          <IngredientSearch />
        </section>

        {/* ── Ingredient table ──────────────────────────────────────────────── */}
        <section aria-labelledby="ingredient-table-label">
          <h2
            id="ingredient-table-label"
            className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2"
          >
            Ingredientes del plato
          </h2>
          <IngredientTable />
        </section>

        {/* ── Export button ─────────────────────────────────────────────────── */}
        <div className="flex justify-end pt-2">
          <button
            id="export-pdf-btn"
            type="button"
            disabled={!canExport || isExporting}
            onClick={handleExport}
            className={[
              'inline-flex items-center gap-2.5 px-6 py-3 rounded-xl',
              'text-sm font-semibold transition-all duration-200 outline-none',
              'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
              canExport && !isExporting
                ? [
                  'bg-brand-600 hover:bg-brand-500 text-white',
                  'shadow-lg shadow-brand-900/50 hover:shadow-brand-800/60',
                  'hover:-translate-y-px active:translate-y-0 active:scale-[0.98]',
                  'focus-visible:ring-brand-500',
                ].join(' ')
                : 'bg-surface-700 text-surface-500 cursor-not-allowed focus-visible:ring-surface-600',
            ].join(' ')}
            title={!canExport ? 'Añade al menos un ingrediente para exportar' : 'Exportar ficha técnica en PDF'}
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            {isExporting ? 'Generando PDF…' : 'Exportar Ficha Técnica'}
          </button>
        </div>

      </div>
    </div>
  );
}
