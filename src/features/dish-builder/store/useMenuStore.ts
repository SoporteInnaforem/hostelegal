import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AllergenId } from '../utils/allergens';
import { normalizeText } from '../utils/normalizeText';

// Re-export so components can import everything from one place
export type { AllergenId };

// ─── Domain types ─────────────────────────────────────────────────────────────

/**
 * Representa un ingrediente dentro de un plato.
 * Los alérgenos se almacenan como un array de IDs en lugar de flags booleanos
 * para facilitar la iteración y la deduplicación en la vista pública.
 */
export interface Ingredient {
  /** Numeric PK — maps to Java Long from the backend. */
  id: number;
  name: string;
  allergens: AllergenId[];
  allergensReviewed?: boolean;
  /** Fila importada con alérgenos globales del plato y sin ingredientes declarados. */
  isDishSummary?: boolean;
}

/**
 * Representa un plato en la carta de alérgenos.
 * El `id` está vacío mientras el plato está en edición (borrador) y se
 * asigna un UUID v4 en el momento en que el usuario lo añade a la carta
 * definitiva. Esta distinción permite detectar si estamos creando o editando.
 */
export interface Dish {
  /** UUID asignado por `saveDishToMenu()`. Cadena vacía mientras está en borrador. */
  id: string;
  name: string;
  ingredients: Ingredient[];
  /** Alérgenos declarados para el plato completo en el formato Excel sencillo. */
  dishAllergens?: AllergenId[];
  dishAllergensReviewed?: boolean;
  section?: string;
}

// ─── State & Actions ──────────────────────────────────────────────────────────

/**
 * Interfaz del estado del store de la carta de alérgenos.
 *
 * Arquitectura de dos capas:
 * - `draftDish`: el plato que el usuario está construyendo actualmente.
 *   Es un espacio de trabajo temporal, invisible para la carta final.
 * - `menu`: la lista de platos comprometidos y visibles en la carta.
 *   Solo un plato pasa de `draft` a `menu` cuando el usuario hace clic en
 *   "Añadir a la Carta". Esta separación evita que cambios a medias
 *   aparezcan en el PDF o el QR público.
 */
interface MenuState {
  ownerId: string | null;
  hydrated: boolean;
  revision: number;
  savedRevision: number;
  /** Platos comprometidos que forman la carta de alérgenos. */
  menu: Dish[];
  /** Plato en edición en el editor. Invisible en la carta final hasta confirmarse. */
  draftDish: Dish;
  /** Nombre que aparece en la cabecera del PDF generado y en la vista pública. */
  restaurantName: string;
}

interface MenuActions {
  setOwner(id: string | null): void;
  hydrate(ownerId: string, menu: Dish[], name: string): void;
  markSaved(ownerId: string, revision: number): void;
  appendDishes(dishes: Dish[]): void;
  reviewIngredient(id: number, allergens: AllergenId[], reviewed: boolean): void;
  reviewDishAllergens(allergens: AllergenId[], reviewed: boolean): void;
  setRestaurantName(name: string): void;
  setDraftName(name: string): void;
  setDraftSection(section: string | undefined): void;
  addDraftIngredient(ingredient: Ingredient): void;
  removeDraftIngredient(id: number): void;
  /** Carga un plato existente en el editor */
  loadDishIntoDraft(dish: Dish): void;
  /** Limpia el editor para salir del modo edición */
  cancelEdit(): void;
  /** Valida, asigna UUID si es nuevo, guarda/actualiza y resetea el draft. */
  saveDishToMenu(): void;
  removeDishFromMenu(dishId: string): void;
  renameSection(previousName: string, nextName: string): void;
  removeSection(name: string): void;
  moveSection(name: string, direction: -1 | 1): void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const emptyDraft = (): Dish => ({ id: '', name: '', ingredients: [] });

const initialState: MenuState = {
  ownerId: null,
  hydrated: false,
  revision: 0,
  savedRevision: 0,
  restaurantName: '',
  menu: [],
  draftDish: emptyDraft(),
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMenuStore = create<MenuState & MenuActions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      setOwner: (ownerId) => {
        if (get().ownerId !== ownerId) set({ ...initialState, draftDish: emptyDraft(), ownerId }, false, 'menu/changeOwner');
      },
      hydrate: (ownerId, menu, restaurantName) => {
        if (get().ownerId === ownerId && !get().hydrated) set({ menu, restaurantName, hydrated: true, revision: 0, savedRevision: 0 }, false, 'menu/hydrate');
      },
      markSaved: (ownerId, revision) => {
        if (get().ownerId === ownerId) set((s) => ({ savedRevision: Math.max(s.savedRevision, revision) }), false, 'menu/saved');
      },
      appendDishes: (dishes) => set((s) => ({ menu: [...s.menu, ...dishes], revision: s.revision + 1 }), false, 'menu/import'),
      reviewIngredient: (id, allergens, allergensReviewed) => set((s) => ({ draftDish: { ...s.draftDish, ingredients: s.draftDish.ingredients.map((i) => i.id === id ? { ...i, allergens, allergensReviewed } : i) } }), false, 'menu/review'),
      reviewDishAllergens: (dishAllergens, dishAllergensReviewed) => set((s) => ({ draftDish: { ...s.draftDish, dishAllergens, dishAllergensReviewed } }), false, 'menu/reviewDishAllergens'),

      setRestaurantName: (name) =>
        set((s) => ({ restaurantName: name, revision: s.revision + 1 }), false, 'menu/setRestaurantName'),

      setDraftName: (name) =>
        set(
          (s) => ({ draftDish: { ...s.draftDish, name } }),
          false,
          'menu/setDraftName'
        ),

      setDraftSection: (section) =>
        set((s) => ({ draftDish: { ...s.draftDish, section } }), false, 'menu/setDraftSection'),

      addDraftIngredient: (ingredient) =>
        set(
          (s) => ({
            draftDish: {
              ...s.draftDish,
              ingredients: [...s.draftDish.ingredients, ingredient],
            },
          }),
          false,
          'menu/addDraftIngredient'
        ),

      removeDraftIngredient: (id: number) =>
        set(
          (s) => ({
            draftDish: {
              ...s.draftDish,
              ingredients: s.draftDish.ingredients.filter((ing) => ing.id !== id),
            },
          }),
          false,
          'menu/removeDraftIngredient'
        ),

      loadDishIntoDraft: (dish) =>
        set({ draftDish: dish }, false, 'menu/loadDishIntoDraft'),

      cancelEdit: () =>
        set({ draftDish: emptyDraft() }, false, 'menu/cancelEdit'),

      /**
       * Valida, asigna UUID si es nuevo, guarda o actualiza el plato en la carta
       * y limpia el borrador.
       *
       * Lógica de upsert:
       * - Si `draftDish.id` está presente (string no vacío), significa que se
       *   está editando un plato existente: se sustituye en el array `menu`
       *   usando `map()` para no mutar el estado directamente.
       * - Si `draftDish.id` es vacío, es un plato nuevo: se le asigna un UUID v4
       *   con `crypto.randomUUID()` y se añade al final del array `menu`.
       * - En ambos casos, el `draftDish` se resetea a un estado vacío para
       *   preparar el editor para el siguiente plato.
       */
      saveDishToMenu: () => {
        const { draftDish, menu } = get();
        if (!draftDish.name.trim() || draftDish.ingredients.length === 0) return;
        const cleanedSection = draftDish.section?.trim().replace(/\s+/g, ' ') || undefined;
        const canonicalSection = cleanedSection ? menu.find(dish => dish.section && normalizeText(dish.section) === normalizeText(cleanedSection))?.section ?? cleanedSection : undefined;
        const dishToSave = { ...draftDish, section: canonicalSection };

        // Si el draft ya tiene un ID, significa que estamos editando un plato existente
        if (dishToSave.id) {
          set(
            (s) => ({
              menu: s.menu.map((d) => (d.id === dishToSave.id ? dishToSave : d)),
              revision: s.revision + 1,
              draftDish: emptyDraft(),
            }),
            false,
            'menu/updateDishInMenu'
          );
        } else {
          // Si no tiene ID, es un plato nuevo
          const dish: Dish = { ...dishToSave, id: crypto.randomUUID() };
          set(
            (s) => ({ menu: [...s.menu, dish], draftDish: emptyDraft(), revision: s.revision + 1 }),
            false,
            'menu/saveDishToMenu'
          );
        }
      },

      removeDishFromMenu: (dishId: string) =>
        set(
          (s) => ({ menu: s.menu.filter((d) => d.id !== dishId), revision: s.revision + 1, draftDish: s.draftDish.id === dishId ? emptyDraft() : s.draftDish }),
          false,
          'menu/removeDishFromMenu'
        ),

      renameSection: (previousName, nextName) => set((s) => {
        const previous = normalizeText(previousName);
        return { menu: s.menu.map(dish => dish.section && normalizeText(dish.section) === previous ? { ...dish, section: nextName } : dish), draftDish: s.draftDish.section && normalizeText(s.draftDish.section) === previous ? { ...s.draftDish, section: nextName } : s.draftDish, revision: s.revision + 1 };
      }, false, 'menu/renameSection'),
      removeSection: (name) => set((s) => {
        const key = normalizeText(name);
        const matches = (value: string | undefined) => value ? normalizeText(value) === key : false;
        return { menu: s.menu.map(dish => matches(dish.section) ? { ...dish, section: undefined } : dish), draftDish: matches(s.draftDish.section) ? { ...s.draftDish, section: undefined } : s.draftDish, revision: s.revision + 1 };
      }, false, 'menu/removeSection'),
      moveSection: (name, direction) => set((s) => {
        const groups = new Map<string, Dish[]>(); const order: string[] = []; const unsectioned: Dish[] = [];
        for (const dish of s.menu) { if (!dish.section) { unsectioned.push(dish); continue; } const key = normalizeText(dish.section); if (!groups.has(key)) { groups.set(key, []); order.push(key); } groups.get(key)!.push(dish); }
        const index = order.indexOf(normalizeText(name)); const target = index + direction;
        if (index < 0 || target < 0 || target >= order.length) return s;
        [order[index], order[target]] = [order[target], order[index]];
        return { menu: [...order.flatMap(key => groups.get(key)!), ...unsectioned], revision: s.revision + 1 };
      }, false, 'menu/moveSection'),

    }),
    { name: 'MenuStore' }
  )
);
