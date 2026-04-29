import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AllergenId } from '../utils/allergens';

// Re-export so components can import everything from one place
export type { AllergenId };

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Ingredient {
  /** Numeric PK — maps to Java Long from the backend. */
  id: number;
  name: string;
  allergens: AllergenId[];
}

export interface Dish {
  /** UUID assigned by saveDishToMenu(). Empty string while in draft. */
  id: string;
  name: string;
  ingredients: Ingredient[];
}

// ─── State & Actions ──────────────────────────────────────────────────────────

interface MenuState {
  /** Committed dishes that form the allergen card. */
  menu: Dish[];
  /** Work-in-progress dish being assembled in the editor. */
  draftDish: Dish;
  /** Name shown in the PDF header. */
  restaurantName: string;
}

interface MenuActions {
  setRestaurantName(name: string): void;
  setDraftName(name: string): void;
  addDraftIngredient(ingredient: Ingredient): void;
  removeDraftIngredient(id: number): void;
  /** Validates, assigns UUID, pushes draftDish to menu, then resets draft. */
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

      saveDishToMenu: () => {
        const { draftDish } = get();
        if (!draftDish.name.trim() || draftDish.ingredients.length === 0) return;
        const dish: Dish = { ...draftDish, id: draftDish.id || crypto.randomUUID() };
        set(
          (s) => ({ menu: [...s.menu, dish], draftDish: emptyDraft() }),
          false,
          'menu/saveDishToMenu'
        );
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
