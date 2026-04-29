import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Allergen identifiers — mirrors the Spring Boot enum sent by the backend.
 * Values are uppercase Spanish strings as defined in the Java AllergenType enum.
 */
export type AllergenId =
  | 'GLUTEN'
  | 'CRUSTACEOS'
  | 'HUEVOS'
  | 'PESCADO'
  | 'CACAHUETES'
  | 'SOJA'
  | 'LACTEOS'
  | 'FRUTOS_DE_CASCARA'
  | 'APIO'
  | 'MOSTAZA'
  | 'SESAMO'
  | 'SULFITOS'
  | 'ALTRAMUCES'
  | 'MOLUSCOS';

export interface Ingredient {
  /** Numeric primary key — maps to Java Long returned by the backend. */
  id: number;
  /** Display name of the ingredient */
  name: string;
  /** Quantity in units (1–100). Defaults to 1 on creation. */
  quantity: number;
  /** List of allergen IDs present in this ingredient */
  allergens: AllergenId[];
}

// ─── State & Actions interface ────────────────────────────────────────────────

interface DishState {
  /** The name of the dish being built */
  dishName: string;
  /** Ordered list of ingredients added to the dish */
  ingredients: Ingredient[];
}

interface DishActions {
  /**
   * Update the dish name.
   * @param name - New dish name (can be empty string to clear)
   */
  setDishName: (name: string) => void;

  /**
   * Add a new ingredient to the dish.
   * The quantity defaults to 1 if not provided.
   * @param ingredient - All fields except `quantity` are required; `quantity` is optional (defaults to 1).
   */
  addIngredient: (
    ingredient: Omit<Ingredient, 'quantity'> & { quantity?: number }
  ) => void;
  // id is number (Long from backend)

  /**
   * Update the quantity of an existing ingredient.
   * Quantity is clamped between 1 and 100 (inclusive).
   * If the ingredient ID is not found, the action is a no-op.
   * @param id       - Ingredient ID to update
   * @param quantity - Desired new quantity (will be validated to [1, 100])
   */
  updateQuantity: (id: number, quantity: number) => void;

  /**
   * Remove an ingredient from the dish by its ID.
   * If the ID is not found, the action is a no-op.
   * @param id - Ingredient ID to remove
   */
  removeIngredient: (id: number) => void;

  /** Reset the store to its initial state (useful for "new dish" flow). */
  resetDish: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 100;

const initialState: DishState = {
  dishName: '',
  ingredients: [],
};

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * `useDishStore` — Central state for the Dish Builder feature.
 *
 * @example
 * ```tsx
 * const { dishName, ingredients, setDishName, addIngredient } = useDishStore();
 * ```
 */
export const useDishStore = create<DishState & DishActions>()(
  devtools(
    (set) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      ...initialState,

      // ── Actions ───────────────────────────────────────────────────────────

      setDishName: (name) =>
        set({ dishName: name }, false, 'dish/setDishName'),

      addIngredient: ({ quantity = 1, ...rest }) => {
        const clampedQty = Math.min(
          MAX_QUANTITY,
          Math.max(MIN_QUANTITY, quantity)
        );

        const newIngredient: Ingredient = {
          ...rest,
          quantity: clampedQty,
        };

        set(
          (state) => ({ ingredients: [...state.ingredients, newIngredient] }),
          false,
          'dish/addIngredient'
        );
      },

      updateQuantity: (id, quantity) => {
        // Clamp between 1 and 100 instead of rejecting invalid values
        const validated = Math.min(
          MAX_QUANTITY,
          Math.max(MIN_QUANTITY, quantity)
        );

        set(
          (state) => ({
            ingredients: state.ingredients.map((ingredient) =>
              ingredient.id === id
                ? { ...ingredient, quantity: validated }
                : ingredient
            ),
          }),
          false,
          'dish/updateQuantity'
        );
      },

      removeIngredient: (id) =>
        set(
          (state) => ({
            ingredients: state.ingredients.filter((ing) => ing.id !== id),
          }),
          false,
          'dish/removeIngredient'
        ),

      resetDish: () => set(initialState, false, 'dish/resetDish'),
    }),
    { name: 'DishBuilderStore' }
  )
);
