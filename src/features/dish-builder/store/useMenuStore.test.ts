import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useMenuStore, type Dish } from './useMenuStore';

const dish = (): Dish => ({ id: 'dish-1', name: 'Sopa', ingredients: [{ id: 1, name: 'Caldo', allergens: [], allergensReviewed: false }] });
const state = () => useMenuStore.getState();
beforeEach(() => { state().setOwner(null); state().setOwner('owner-a'); });

test('changing account clears menu, draft, restaurant name and save state', () => {
  state().hydrate('owner-a', [dish()], 'Restaurante A');
  state().loadDishIntoDraft(dish());
  state().setRestaurantName('Nombre cambiado');
  state().markSaved('owner-a', state().revision);
  state().setOwner('owner-b');
  assert.deepEqual(state().menu, []);
  assert.deepEqual(state().draftDish, { id: '', name: '', ingredients: [] });
  assert.equal(state().restaurantName, '');
  assert.equal(state().hydrated, false);
  assert.equal(state().revision, 0);
  assert.equal(state().savedRevision, 0);
});

test('late hydration and save from previous account do not affect next account', () => {
  state().setOwner('owner-b');
  state().hydrate('owner-a', [dish()], 'Restaurante A');
  state().markSaved('owner-a', 42);
  assert.equal(state().hydrated, false);
  assert.deepEqual(state().menu, []);
  assert.equal(state().savedRevision, 0);
  state().hydrate('owner-b', [], 'Restaurante B');
  state().appendDishes([dish()]);
  state().hydrate('owner-b', [], 'Carga obsoleta');
  assert.equal(state().menu.length, 1);
  assert.equal(state().restaurantName, 'Restaurante B');
});

test('save acknowledgements preserve newer unsaved changes and never move backwards', () => {
  state().hydrate('owner-a', [], 'Restaurante');
  state().appendDishes([dish()]);
  const firstRevision = state().revision;
  state().setRestaurantName('Nuevo nombre');
  state().markSaved('owner-a', firstRevision);
  assert.ok(state().savedRevision < state().revision);
  state().markSaved('owner-a', state().revision);
  state().markSaved('owner-a', firstRevision);
  assert.equal(state().savedRevision, state().revision);
});

test('reviewing a draft does not change committed data until saving; save edits in place', () => {
  state().hydrate('owner-a', [dish()], 'Restaurante');
  state().loadDishIntoDraft(state().menu[0]);
  state().reviewIngredient(1, [], true);
  state().setDraftName('Sopa revisada');
  assert.equal(state().menu[0].ingredients[0].allergensReviewed, false);
  assert.equal(state().revision, 0);
  state().saveDishToMenu();
  assert.equal(state().menu.length, 1);
  assert.equal(state().menu[0].id, 'dish-1');
  assert.equal(state().menu[0].name, 'Sopa revisada');
  assert.equal(state().menu[0].ingredients[0].allergensReviewed, true);
  assert.equal(state().draftDish.name, '');
  assert.equal(state().revision, 1);
});

test('removing the dish being edited clears its draft and cannot resurrect it', () => {
  state().hydrate('owner-a', [dish()], 'Restaurante');
  state().loadDishIntoDraft(state().menu[0]);
  state().removeDishFromMenu('dish-1');
  assert.deepEqual(state().menu, []);
  assert.equal(state().draftDish.id, '');
  state().saveDishToMenu();
  assert.deepEqual(state().menu, []);
});

test('cancel and ingredient removal preserve the committed dish', () => {
  state().hydrate('owner-a', [dish()], 'Restaurante');
  state().loadDishIntoDraft(state().menu[0]);
  state().removeDraftIngredient(1);
  assert.equal(state().draftDish.ingredients.length, 0);
  assert.equal(state().menu[0].ingredients.length, 1);
  state().cancelEdit();
  assert.deepEqual(state().draftDish, { id: '', name: '', ingredients: [] });
});
