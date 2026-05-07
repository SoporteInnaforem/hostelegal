import { useEffect, useRef, useState } from "react";
import { Search, PackageSearch, X } from "lucide-react";
import { useMenuStore } from "../store/useMenuStore";
import { INGREDIENTS_DB } from "../../../data/ingredients";
import type { DbIngredient } from "../../../data/ingredients";

// ─── Component ────────────────────────────────────────────────────────────────

export function IngredientSearch() {
  const addDraftIngredient = useMenuStore((s) => s.addDraftIngredient);
  const draftIngredients = useMenuStore((s) => s.draftDish.ingredients);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim().toLowerCase();
  const results = trimmed
    ? INGREDIENTS_DB.filter((i) => i.name.toLowerCase().includes(trimmed))
    : INGREDIENTS_DB;

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

  function handleSelect(item: DbIngredient) {
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
    if (!isOpen || results.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex])
          handleSelect(results[activeIndex]);
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur(); // Quita el foco al pulsar Escape
        break;
    }
  }

  const alreadyAdded = (id: number) =>
    draftIngredients.some((ing) => ing.id === id);

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
          placeholder="Busca o selecciona un ingrediente…"
          aria-label="Buscar ingrediente"
          aria-expanded={isOpen}
          className="flex-1 bg-transparent outline-none text-surface-800 placeholder:text-surface-400 text-sm font-medium leading-tight [&::-webkit-search-cancel-button]:hidden"
        />

        {/* BOTÓN X PARA CERRAR/LIMPIAR EN MÓVIL */}
        {(query || isOpen) && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuery("");
              setIsOpen(false);
              inputRef.current?.blur(); // Esto esconde el teclado en móviles
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
          {results.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-surface-500 text-sm">
              <PackageSearch size={28} className="opacity-50" />
              <span>Sin resultados para «{query.trim()}»</span>
            </div>
          )}
          {results.length > 0 && (
            <ul
              ref={listRef}
              id="ingredient-search-listbox"
              role="listbox"
              className="max-h-64 overflow-y-auto py-1 divide-y divide-surface-100"
            >
              {results.map((item, idx) => {
                const added = alreadyAdded(item.id);
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
                    <span className="font-medium truncate">{item.name}</span>
                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      {added && (
                        <span className="text-xs text-surface-400 italic">
                          ya añadido
                        </span>
                      )}
                      {item.allergens.slice(0, 3).map((a) => (
                        <span
                          key={a}
                          className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-brand-50 text-brand-600 border border-brand-200"
                        >
                          {a}
                        </span>
                      ))}
                      {item.allergens.length > 3 && (
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