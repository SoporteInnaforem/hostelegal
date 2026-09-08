import type { Dish, Ingredient } from '../store/useMenuStore';
import { ALLERGEN_LABEL } from './allergens';
import { MAX_MENU_SECTIONS, MAX_SECTION_NAME, sectionKey } from './menuSections';

export function isIngredientReviewed(ingredient: Ingredient): boolean {
  return ingredient.allergensReviewed === true ||
    (ingredient.allergensReviewed === undefined && ingredient.allergens.length > 0);
}

export function pendingIngredients(menu: Dish[]): number {
  return menu.reduce((total, dish) => total + (dish.dishAllergensReviewed !== undefined
    ? Number(!dish.dishAllergensReviewed)
    : dish.ingredients.filter((i) => !isIngredientReviewed(i)).length), 0);
}

/** Reject malformed remote JSON before allowing edits or publishing. */
export function parseStoredMenu(value: unknown): Dish[] {
  if (!Array.isArray(value) || value.length > 300) throw new Error('La carta guardada no tiene un formato válido. Contacta con soporte.');
  const ids = new Set<string>();
  const sections = new Set<string>();
  for (const dish of value) {
    if (!dish || typeof dish.id !== 'string' || typeof dish.name !== 'string' || !dish.name.trim() || dish.name.length > 120 || !Array.isArray(dish.ingredients) || dish.ingredients.length > 100 || dish.ingredients.length === 0 || (dish.section !== undefined && (typeof dish.section !== 'string' || !dish.section.trim() || dish.section.length > MAX_SECTION_NAME)) || ((dish.dishAllergens === undefined) !== (dish.dishAllergensReviewed === undefined)) || (dish.dishAllergens !== undefined && (!Array.isArray(dish.dishAllergens) || dish.dishAllergens.some((a: unknown) => typeof a !== 'string' || !Object.hasOwn(ALLERGEN_LABEL, a)))) || (dish.dishAllergensReviewed !== undefined && typeof dish.dishAllergensReviewed !== 'boolean')) throw new Error('Hay un plato guardado con datos inválidos. Contacta con soporte.');
    if (!dish.id.trim() || ids.has(dish.id)) throw new Error('Hay identificadores de plato inválidos o repetidos. Contacta con soporte.');
    ids.add(dish.id);
    if (dish.section) sections.add(sectionKey(dish.section));
    if (sections.size > MAX_MENU_SECTIONS) throw new Error('La carta guardada supera el máximo de secciones. Contacta con soporte.');
    const ingredientIds = new Set<number>();
    for (const i of dish.ingredients) {
      if (!i || !Number.isSafeInteger(i.id) || ingredientIds.has(i.id) || typeof i.name !== 'string' || !i.name.trim() || i.name.length > 160 || !Array.isArray(i.allergens) || i.allergens.some((a: unknown) => typeof a !== 'string' || !Object.hasOwn(ALLERGEN_LABEL, a)) || (i.allergensReviewed !== undefined && typeof i.allergensReviewed !== 'boolean') || (i.isDishSummary !== undefined && typeof i.isDishSummary !== 'boolean')) throw new Error('Hay un ingrediente guardado con datos inválidos. Contacta con soporte.');
      ingredientIds.add(i.id);
    }
  }
  return value as Dish[];
}
