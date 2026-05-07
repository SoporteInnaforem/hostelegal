import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ChefHat,
  FileDown,
  Loader2,
  Trash2,
  BookOpen,
  PenLine,
  Building2,
  ArrowLeft,
  Info,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMenuStore } from "./store/useMenuStore";
import type { Dish } from "./store/useMenuStore";
import { ALLERGEN_LABEL } from "./utils/allergens";
import type { AllergenId } from "./utils/allergens";
import { AllergenIcon } from "./components/AllergenIcon";
import { IngredientSearch } from "./components/IngredientSearch";
import { IngredientTable } from "./components/IngredientTable";
import { PublishModal } from "./components/PublishModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ALLERGEN_IDS = Object.keys(ALLERGEN_LABEL) as AllergenId[];
const BRAND_RGB: [number, number, number] = [27, 97, 116];

// ─── svgUrlToBase64 ───────────────────────────────────────────────────────────

async function imgUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No 2d context"));
        return;
      }

      const scale = Math.min(64 / img.width, 64 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const dx = (64 - w) / 2;
      const dy = (64 - h) / 2;

      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(img, dx, dy, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`Failed: ${url}`));
    img.src = url;
  });
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

type IconMap = Partial<Record<string, string>>;
type AutoTableDoc = { lastAutoTable: { finalY: number } };

function drawIconsInCell(
  doc: jsPDF,
  data: Parameters<
    NonNullable<Parameters<typeof autoTable>[1]["didDrawCell"]>
  >[0],
  allergens: AllergenId[],
  iconMap: IconMap,
  iconMm: number,
) {
  let iconX = data.cell.x + 2;
  const iconY = data.cell.y + (data.cell.height - iconMm) / 2;
  const maxX = data.cell.x + data.cell.width - 1;
  for (const allergen of allergens) {
    if (iconX + iconMm > maxX) break;
    const b64 = iconMap[allergen];
    if (b64) {
      doc.addImage(b64, "PNG", iconX, iconY, iconMm, iconMm);
      iconX += iconMm + 1.5;
    }
  }
}

// ─── exportCartaPDF ───────────────────────────────────────────────────────────

async function exportCartaPDF(
  restaurantName: string,
  menu: Dish[],
  iconMap: IconMap,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const now = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const ICON = 5.5;

  // ── A) Cabecera ─────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, pageW, 30, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(restaurantName.trim() || "Sin nombre", M, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(210, 240, 245);
  doc.text(
    "Carta de Información de Alérgenos · Reglamento (UE) nº 1169/2011",
    M,
    24,
  );

  let cursorY = 40;

  // ── B) Tabla 1: Resumen de La Carta ─────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(27, 97, 116);
  doc.text("Resumen de la Carta", M, cursorY);
  cursorY += 5;

  const summaryAllergens: AllergenId[][] = [];
  const summaryRows = menu.map((dish) => {
    const unique = [...new Set(dish.ingredients.flatMap((i) => i.allergens))];
    summaryAllergens.push(unique);
    return [dish.name, ""];
  });

  autoTable(doc, {
    startY: cursorY,
    head: [["Nombre del Plato", "Alérgenos"]],
    body: summaryRows,
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      minCellHeight: ICON + 6,
      lineColor: [220, 235, 240],
      lineWidth: 0.15,
      valign: "middle",
    },
    headStyles: {
      fillColor: BRAND_RGB,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [250, 253, 253] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80 },
      1: { cellWidth: 102 },
    },
    margin: { left: M, right: M },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 1) return;
      drawIconsInCell(
        doc,
        data,
        summaryAllergens[data.row.index],
        iconMap,
        ICON,
      );
    },
  });

  cursorY = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 20;
  if (cursorY > pageH - 80) {
    doc.addPage();
    cursorY = 20;
  }

  // ── C) Leyenda de Alérgenos ──────────────────────────────────────────────────
  doc.setDrawColor(200, 220, 225);
  doc.setLineWidth(0.5);
  doc.line(M, cursorY - 8, pageW - M, cursorY - 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(27, 97, 116);
  doc.text("Leyenda de Alérgenos", M, cursorY);
  cursorY += 8;

  const LEG_ICON = 7;
  const LEG_COLS = 4;
  const LEG_COL_W = (pageW - M * 2) / LEG_COLS;
  let col = 0;
  let rowY = cursorY;

  for (const allergen of ALL_ALLERGEN_IDS) {
    const x = M + col * LEG_COL_W;
    const b64 = iconMap[allergen];
    if (b64)
      doc.addImage(b64, "PNG", x, rowY - LEG_ICON + 2, LEG_ICON, LEG_ICON);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(70, 80, 85);
    doc.text(ALLERGEN_LABEL[allergen], x + LEG_ICON + 3, rowY + 0.5);
    col++;
    if (col >= LEG_COLS) {
      col = 0;
      rowY += LEG_ICON + 5;
    }
  }

  cursorY = rowY + LEG_ICON + 20;
  if (cursorY > pageH - 60) {
    doc.addPage();
    cursorY = 20;
  }

  // ── D) Tablas de Desglose por Plato ─────────────────────────────────────────
  doc.setDrawColor(200, 220, 225);
  doc.setLineWidth(0.5);
  doc.line(M, cursorY - 8, pageW - M, cursorY - 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(27, 97, 116);
  doc.text("Desglose por Plato", M, cursorY);
  cursorY += 8;

  for (const dish of menu) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 50, 55);
    doc.text(dish.name, M, cursorY);
    cursorY += 3;

    const rowAllergens: AllergenId[][] = [];
    const rows = dish.ingredients.map((ing) => {
      rowAllergens.push(ing.allergens);
      return [ing.name, ""];
    });

    autoTable(doc, {
      startY: cursorY,
      head: [["Ingrediente", "Alérgenos"]],
      body: rows,
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
        minCellHeight: ICON + 6,
        lineColor: [220, 235, 240],
        lineWidth: 0.15,
        valign: "middle",
      },
      headStyles: {
        fillColor: BRAND_RGB,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [250, 253, 253] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 80 },
        1: { cellWidth: 102 },
      },
      margin: { left: M, right: M },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 1) return;
        drawIconsInCell(doc, data, rowAllergens[data.row.index], iconMap, ICON);
      },
    });

    cursorY = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 12;
    if (cursorY > pageH - 30) {
      doc.addPage();
      cursorY = 20;
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 150, 160);
  doc.text(`Generado el ${now} · AlergoMenu`, M, pageH - 8);
  doc.text("Página 1", pageW - M, pageH - 8, { align: "right" });

  const safeName =
    restaurantName
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_áéíóúñ]/gi, "") || "carta";
  doc.save(`carta_${safeName}.pdf`);
}

// ─── MenuRow ──────────────────────────────────────────────────────────────────

function MenuRow({ dish }: { dish: Dish }) {
  const removeDishFromMenu = useMenuStore((s) => s.removeDishFromMenu);
  const [confirming, setConfirming] = useState(false);
  const uniqueAllergens = [
    ...new Set(dish.ingredients.flatMap((i) => i.allergens)),
  ];

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2000);
      return;
    }
    removeDishFromMenu(dish.id);
  }

  return (
    <tr className="border-b border-surface-200 hover:bg-brand-50 transition-colors duration-100">
      <td className="px-4 py-3 font-semibold text-surface-800 whitespace-nowrap">
        {dish.name}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {uniqueAllergens.length === 0 ? (
            <span className="text-xs text-surface-400 italic">
              Sin alérgenos
            </span>
          ) : (
            uniqueAllergens.map((a) => (
              <AllergenIcon key={a} allergen={a} size="sm" />
            ))
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={handleDelete}
          aria-label={
            confirming ? "Confirmar eliminación" : `Eliminar ${dish.name}`
          }
          className={[
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            confirming
              ? "bg-danger-600/10 text-danger-600 border border-danger-600/30"
              : "bg-surface-200 text-surface-600 border border-transparent hover:bg-danger-600/10 hover:text-danger-600",
          ].join(" ")}
        >
          <Trash2 size={13} />
          {confirming ? "Confirmar" : "Quitar"}
        </button>
      </td>
    </tr>
  );
}

// ─── MenuBuilder ──────────────────────────────────────────────────────────────

export function MenuBuilder() {
  const menu = useMenuStore((s) => s.menu);
  const draftDish = useMenuStore((s) => s.draftDish);
  const restaurantName = useMenuStore((s) => s.restaurantName);
  const setRestaurantName = useMenuStore((s) => s.setRestaurantName);
  const setDraftName = useMenuStore((s) => s.setDraftName);
  const saveDishToMenu = useMenuStore((s) => s.saveDishToMenu);

  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const canSave = draftDish.name.trim().length > 0 && draftDish.ingredients.length > 0;
  const canExport = menu.length > 0 && restaurantName.trim().length > 0;

  // --- PRECARGA INTELIGENTE DEL NOMBRE (SIN BUG) ---
  useEffect(() => {
    async function loadName() {
      if (restaurantName) return; // Si ya hay nombre, no machacamos

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cartaData } = await supabase
        .from("cartas")
        .select("nombre_carta")
        .eq("empresa_id", user.id)
        .maybeSingle();

      if (cartaData?.nombre_carta) {
        setRestaurantName(cartaData.nombre_carta);
      } else {
        const { data: empresaData } = await supabase
          .from("empresas")
          .select("nombre_restaurante")
          .eq("id", user.id)
          .maybeSingle();

        if (empresaData?.nombre_restaurante) {
          setRestaurantName(empresaData.nombre_restaurante);
        }
      }
    }
    loadName();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const iconMap: IconMap = {};
      await Promise.all(
        ALL_ALLERGEN_IDS.map(async (allergen) => {
          try {
            iconMap[allergen] = await imgUrlToBase64(
              `/icons/allergens/${allergen.toLowerCase()}.png`,
            );
          } catch {
            // ignorar
          }
        }),
      );
      await exportCartaPDF(restaurantName, menu, iconMap);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* 1. CABECERA UNIFICADA */}
      <header className="bg-white border-b border-surface-200 px-4 sm:px-6 h-16 flex-none z-20 shadow-sm flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="p-2 -ml-2 rounded-lg text-surface-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-brand-100 p-1.5 rounded-lg text-brand-600 hidden sm:block">
              <ChefHat size={16} />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-surface-800 truncate max-w-[150px] sm:max-w-none">
              Carta Digital
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="export-carta-btn"
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={!canExport || isExporting}
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 outline-none",
              canExport && !isExporting
                ? "bg-brand-500 hover:bg-brand-600 text-white shadow-md hover:-translate-y-px"
                : "bg-surface-200 text-surface-400 cursor-not-allowed",
            ].join(" ")}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            <span className="hidden sm:inline">{isExporting ? "Generando..." : "Publicar Carta"}</span>
            <span className="sm:hidden">{isExporting ? "..." : "Publicar"}</span>
          </button>
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 -mr-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Ver ayuda"
          >
            <Info size={22} />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-8">

        {/* Nombre del establecimiento (Input simple) */}
        <div>
          <label
            htmlFor="restaurant-name-input"
            className="block text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2"
          >
            Nombre del establecimiento
          </label>
          <div
            className={[
              "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 bg-white shadow-sm",
              restaurantName.trim()
                ? "border-brand-400 ring-1 ring-brand-300"
                : "border-surface-300 hover:border-surface-400",
            ].join(" ")}
          >
            <Building2 size={18} className="shrink-0 text-surface-400" />
            <input
              id="restaurant-name-input"
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Ej: Nombre de tu restaurante o título de la carta..."
              maxLength={80}
              className="flex-1 bg-transparent outline-none text-surface-800 placeholder:text-surface-400 text-sm font-medium"
            />
            {restaurantName.trim() && (
              <span className="text-[10px] text-brand-600 font-semibold shrink-0">
                ✓ listo
              </span>
            )}
          </div>
        </div>

        {/* ZONA 1: LA CARTA */}
        <section aria-labelledby="menu-section-label">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={15} className="text-brand-600" />
            <h2
              id="menu-section-label"
              className="text-xs font-semibold uppercase tracking-wider text-surface-500"
            >
              La Carta
              {menu.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-brand-500/15 text-brand-700 text-[10px] font-bold">
                  {menu.length}
                </span>
              )}
            </h2>
          </div>
          <div className="rounded-xl border border-surface-300 overflow-hidden bg-white shadow-sm">
            {menu.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-surface-400">
                <BookOpen size={28} className="opacity-40" />
                <p className="text-sm font-medium text-surface-500">
                  La carta está vacía
                </p>
                <p className="text-xs text-surface-400 text-center max-w-xs">
                  Crea platos en el editor de abajo y añádelos.
                </p>
              </div>
            ) : (
              <table
                className="w-full text-sm border-collapse"
                aria-label="Platos en la carta"
              >
                <thead>
                  <tr className="bg-surface-100 border-b border-surface-200">
                    {["Nombre del Plato", "Alérgenos", "Acción"].map(
                      (col, i) => (
                        <th
                          key={col}
                          scope="col"
                          className={[
                            "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500",
                            i === 2 ? "text-center w-28" : "text-left",
                          ].join(" ")}
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {menu.map((dish) => (
                    <MenuRow key={dish.id} dish={dish} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* DIVIDER */}
        <div className="relative flex items-center gap-4">
          <div className="flex-1 border-t border-surface-200" />
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-surface-400">
            <PenLine size={12} />
            Editor
          </span>
          <div className="flex-1 border-t border-surface-200" />
        </div>

        {/* ZONA 2: DRAFT EDITOR */}
        <section
          aria-labelledby="draft-section-label"
          className="flex flex-col gap-6"
        >
          <h2
            id="draft-section-label"
            className="text-base font-semibold text-surface-700"
          >
            Nuevo Plato
          </h2>
          <div>
            <label
              htmlFor="draft-dish-name"
              className="block text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2"
            >
              Nombre del plato
            </label>
            <input
              id="draft-dish-name"
              type="text"
              value={draftDish.name}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Ej: Ensalada de gambas con aguacate…"
              maxLength={120}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200 bg-white border border-surface-300 text-surface-800 placeholder:text-surface-400 hover:border-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="flex justify-end mt-1">
              <span
                className={[
                  "text-[11px] tabular-nums",
                  draftDish.name.length > 100
                    ? "text-warning-600"
                    : "text-surface-400",
                ].join(" ")}
              >
                {draftDish.name.length}/120
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">
              Añadir ingrediente
            </label>
            <IngredientSearch />
          </div>
          <IngredientTable />
          <div className="flex justify-end">
            <button
              id="save-dish-btn"
              type="button"
              onClick={saveDishToMenu}
              disabled={!canSave}
              title={
                !canSave
                  ? "El plato necesita nombre y al menos un ingrediente"
                  : "Añadir a la carta"
              }
              className={[
                "inline-flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200 outline-none",
                canSave
                  ? "bg-brand-500 hover:bg-brand-600 text-white shadow-md hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
                  : "bg-surface-200 text-surface-400 cursor-not-allowed",
              ].join(" ")}
            >
              <BookOpen size={16} />
              Añadir a la Carta
            </button>
          </div>
        </section>
      </main>

      <PublishModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGeneratePDF={() => {
          setIsModalOpen(false);
          handleExport();
        }}
        platos={menu}
        restaurantName={restaurantName}
      />

      {/* MODAL DE AYUDA */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col slide-in-from-bottom-4">
            <div className="px-5 py-4 border-b border-surface-200 flex justify-between items-center bg-brand-50">
              <div className="flex items-center gap-2 text-brand-700">
                <Info size={20} />
                <h3 className="font-bold">¿Cómo funciona?</h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-surface-400 hover:text-surface-700 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 text-surface-600 text-sm leading-relaxed space-y-4">
              <p>
                Escribe el nombre de tu carta y comienza a crear platos añadiendo ingredientes.
              </p>
              <p>
                El sistema detectará automáticamente los alérgenos presentes. Al hacer clic en <strong>Publicar Carta</strong>, podrás generar tu PDF o el QR digital.
              </p>
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full mt-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                Entendido, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}