import { useEffect, useRef, useState } from "react";
import { Search, PackageSearch, X, Plus } from "lucide-react";
import { useMenuStore } from "../store/useMenuStore";
import { INGREDIENTS_DB } from "../../../data/ingredients";

// ─── Tipos Extendidos ────────────────────────────────────────────────────────
// Este tipo nos permite mezclar los ingredientes de la BD con los "inventados"
type DisplayItem = {
  id: number;
  name: string;
  allergens: any[];
  isCustom?: boolean;
};

export function IngredientSearch() {
  const addDraftIngredient = useMenuStore((s) => s.addDraftIngredient);
  const draftIngredients = useMenuStore((s) => s.draftDish.ingredients);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const lowerQuery = trimmed.toLowerCase();

  // 1. Filtramos la base de datos normal
  const dbResults = lowerQuery
    ? INGREDIENTS_DB.filter((i) => i.name.toLowerCase().includes(lowerQuery))
    : INGREDIENTS_DB;

  // 2. Comprobamos si hay coincidencia exacta para no sugerir "Crear" si ya existe
  const isExactMatch = INGREDIENTS_DB.some((i) => i.name.toLowerCase() === lowerQuery);

  // 3. Si ha escrito algo y no es exactamente igual a la BD, creamos la opción "Añadir..."
  const customOption: DisplayItem | null =
    trimmed && !isExactMatch
      ? { id: Date.now(), name: trimmed, allergens: [], isCustom: true }
      : null;

  // 4. Juntamos la opción custom (si existe) colocándola la primera de la lista
  const displayResults: DisplayItem[] = customOption
    ? [customOption, ...dbResults]
    : dbResults;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    (
      listRef.current.children[activeIndex] as HTMLElement | undefined
    )?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const alreadyAdded = (item: DisplayItem) => {
    // Si es de la BD, verificamos por ID para mayor precisión
    if (!item.isCustom) return draftIngredients.some((ing) => ing.id === item.id);
    // Si es custom, verificamos por nombre para que no añadan "Patata" tres veces
    return draftIngredients.some((ing) => ing.name.toLowerCase() === item.name.toLowerCase());
  };

  function handleSelect(item: DisplayItem) {
    addDraftIngredient({
      id: item.id,
      name: item.name,
      allergens: item.allergens,
    });
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || displayResults.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, displayResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        // Si el usuario presiona Enter rápido, elige el seleccionado o el primero por defecto
        const indexToSelect = activeIndex >= 0 ? activeIndex : 0;
        const item = displayResults[indexToSelect];
        if (item && !alreadyAdded(item)) {
          handleSelect(item);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur(); // Quita el foco al pulsar Escape
        break;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className={[
          "flex items-center gap-2 px-4 py-3 bg-white border rounded-xl transition-all duration-200",
          isOpen
            ? "border-brand-500 ring-2 ring-brand-500/20 shadow-sm"
            : "border-surface-300 hover:border-surface-400",
        ].join(" ")}
      >
        <Search size={18} className="text-surface-400 shrink-0" />

        <input
          ref={inputRef}
          id="ingredient-search-input"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Busca o escribe un ingrediente nuevo…"
          aria-label="Buscar ingrediente"
          aria-expanded={isOpen}
          className="flex-1 bg-transparent outline-none text-surface-800 placeholder:text-surface-400 text-sm font-medium leading-tight [&::-webkit-search-cancel-button]:hidden"
        />

        {(query || isOpen) && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuery("");
              setIsOpen(false);
              inputRef.current?.blur();
            }}
            className="p-1 rounded-md text-surface-400 hover:text-surface-700 bg-surface-100 hover:bg-surface-200 shrink-0 transition-colors"
            title="Cerrar buscador"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-surface-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {displayResults.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-surface-500 text-sm">
              <PackageSearch size={28} className="opacity-50" />
              <span>Sin resultados para «{query.trim()}»</span>
            </div>
          )}
          {displayResults.length > 0 && (
            <ul
              ref={listRef}
              id="ingredient-search-listbox"
              role="listbox"
              className="max-h-64 overflow-y-auto py-1 divide-y divide-surface-100"
            >
              {displayResults.map((item, idx) => {
                const added = alreadyAdded(item);
                const isActive = idx === activeIndex;
                return (
                  <li
                    key={item.id}
                    id={`ingredient-option-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    aria-disabled={added}
                    onClick={() => !added && handleSelect(item)}
                    onMouseEnter={() => !added && setActiveIndex(idx)}
                    className={[
                      "flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-100 cursor-pointer select-none",
                      added
                        ? "opacity-50 cursor-not-allowed bg-surface-50"
                        : isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-surface-700 hover:bg-surface-50",
                    ].join(" ")}
                  >
                    {/* Renderizamos diferente si es la opción de Crear Custom */}
                    {item.isCustom ? (
                      <div className="flex items-center gap-2 text-brand-600">
                        <Plus size={16} />
                        <span className="font-bold">Añadir "{item.name}"</span>
                      </div>
                    ) : (
                      <span className="font-medium truncate">{item.name}</span>
                    )}

                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      {added && (
                        <span className="text-xs text-surface-400 italic">
                          ya añadido
                        </span>
                      )}
                      {/* Los ingredientes Custom no tienen alérgenos, así que este bloque solo aplica a los de la BD */}
                      {!item.isCustom && item.allergens.slice(0, 3).map((a) => (
                        <span
                          key={a}
                          className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-brand-50 text-brand-600 border border-brand-200"
                        >
                          {a}
                        </span>
                      ))}
                      {!item.isCustom && item.allergens.length > 3 && (
                        <span className="text-[10px] text-surface-400">
                          +{item.allergens.length - 3}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}