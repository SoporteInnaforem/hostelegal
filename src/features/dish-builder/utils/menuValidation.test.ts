import test from 'node:test';
import assert from 'node:assert/strict';
import { isIngredientReviewed, pendingIngredients, parseStoredMenu } from './menuValidation';
import type { Dish, Ingredient } from '../store/useMenuStore';

const ingredient = (override: Partial<Ingredient> = {}): Ingredient => ({ id: 1, name: 'Ingrediente', allergens: [], ...override });
const dish = (): Dish => ({ id: 'dish-1', name: 'Plato', ingredients: [ingredient()] });

test('blank allergen lists remain pending until explicitly reviewed as none', () => {
  assert.equal(isIngredientReviewed(ingredient()), false);
  assert.equal(isIngredientReviewed(ingredient({ allergensReviewed: false })), false);
  assert.equal(isIngredientReviewed(ingredient({ allergensReviewed: true })), true);
  assert.equal(isIngredientReviewed(ingredient({ allergens: ['GLUTEN'] })), true);
  assert.equal(isIngredientReviewed(ingredient({ allergens: ['GLUTEN'], allergensReviewed: false })), false);
  assert.equal(pendingIngredients([{ ...dish(), ingredients: [ingredient(), ingredient({ allergensReviewed: true }), ingredient({ allergens: ['HUEVOS'] }), ingredient({ allergens: ['GLUTEN'], allergensReviewed: false })] }]), 2);
});

test('accepts empty menus and valid legacy ingredients without silently reviewing them', () => {
  assert.deepEqual(parseStoredMenu([]), []);
  const parsed = parseStoredMenu([dish()]);
  assert.equal(parsed[0].ingredients[0].allergensReviewed, undefined);
  assert.equal(pendingIngredients(parsed), 1);
});

test('dish-level allergens replace ingredient review only when explicitly confirmed', () => {
  const reviewedDish = { ...dish(), dishAllergens: ['PESCADO'] as const, dishAllergensReviewed: true };
  assert.deepEqual(parseStoredMenu([reviewedDish])[0].dishAllergens, ['PESCADO']);
  assert.equal(pendingIngredients([reviewedDish]), 0);
  assert.equal(pendingIngredients([{ ...reviewedDish, dishAllergensReviewed: false }]), 1);
  for (const invalid of [
    { ...dish(), dishAllergensReviewed: true },
    { ...dish(), dishAllergens: ['PESCADO'] },
    { ...dish(), dishAllergens: ['DESCONOCIDO'], dishAllergensReviewed: true },
  ]) assert.throws(() => parseStoredMenu([invalid]));
});

test('rejects malformed menus, dish metadata and oversized collections', () => {
  for (const invalid of [null, {}, '[]', [null], [{ ...dish(), name: '' }], [{ ...dish(), name: 'a'.repeat(121) }], [{ ...dish(), ingredients: [] }], [{ ...dish(), ingredients: Array.from({ length: 101 }, () => ingredient()) }], Array.from({ length: 301 }, dish)]) {
    assert.throws(() => parseStoredMenu(invalid));
  }
});

test('rejects invalid ingredient fields and unknown or prototype-key allergens', () => {
  const invalidIngredients = [null, { ...ingredient(), id: 1.5 }, { ...ingredient(), name: '' }, { ...ingredient(), name: 'a'.repeat(161) }, { ...ingredient(), allergens: null }, { ...ingredient(), allergens: ['UNKNOWN'] }, { ...ingredient(), allergens: ['__proto__'] }, { ...ingredient(), allergens: ['toString'] }, { ...ingredient(), allergensReviewed: 'true' }];
  for (const invalid of invalidIngredients) assert.throws(() => parseStoredMenu([{ ...dish(), ingredients: [invalid] }]));
});

test('rejects empty and duplicate dish IDs to avoid editing or deleting multiple dishes', () => {
  assert.throws(() => parseStoredMenu([{ ...dish(), id: '' }]));
  assert.throws(() => parseStoredMenu([dish(), { ...dish(), name: 'Otro plato' }]));
});

