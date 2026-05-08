import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AllergenId } from '../utils/allergens';

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
  /** Platos comprometidos que forman la carta de alérgenos. */
  menu: Dish[];
  /** Plato en edición en el editor. Invisible en la carta final hasta confirmarse. */
  draftDish: Dish;
  /** Nombre que aparece en la cabecera del PDF generado y en la vista pública. */
  restaurantName: string;
}

interface MenuActions {
  setRestaurantName(name: string): void;
  setDraftName(name: string): void;
  addDraftIngredient(ingredient: Ingredient): void;
  removeDraftIngredient(id: number): void;
  /** Carga un plato existente en el editor */
  loadDishIntoDraft(dish: Dish): void;
  /** Limpia el editor para salir del modo edición */
  cancelEdit(): void;
  /** Valida, asigna UUID si es nuevo, guarda/actualiza y resetea el draft. */
  saveDishToMenu(): void;
  removeDishFromMenu(dishId: string): void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const emptyDraft = (): Dish => ({ id: '', name: '', ingredients: [] });

const initialState: MenuState = {
  restaurantName: '',
  menu: [],
  draftDish: emptyDraft(),
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMenuStore = create<MenuState & MenuActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setRestaurantName: (name) =>
        set({ restaurantName: name }, false, 'menu/setRestaurantName'),

      setDraftName: (name) =>
        set(
          (s) => ({ draftDish: { ...s.draftDish, name } }),
          false,
          'menu/setDraftName'
        ),

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
        const { draftDish } = get();
        if (!draftDish.name.trim() || draftDish.ingredients.length === 0) return;

        // Si el draft ya tiene un ID, significa que estamos editando un plato existente
        if (draftDish.id) {
          set(
            (s) => ({
              menu: s.menu.map((d) => (d.id === draftDish.id ? { ...draftDish } : d)),
              draftDish: emptyDraft(),
            }),
            false,
            'menu/updateDishInMenu'
          );
        } else {
          // Si no tiene ID, es un plato nuevo
          const dish: Dish = { ...draftDish, id: crypto.randomUUID() };
          set(
            (s) => ({ menu: [...s.menu, dish], draftDish: emptyDraft() }),
            false,
            'menu/saveDishToMenu'
          );
        }
      },

      removeDishFromMenu: (dishId: string) =>
        set(
          (s) => ({ menu: s.menu.filter((d) => d.id !== dishId) }),
          false,
          'menu/removeDishFromMenu'
        ),
    }),
    { name: 'MenuStore' }
  )
);
