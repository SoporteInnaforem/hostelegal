import test from 'node:test';
import assert from 'node:assert/strict';
import type { Dish } from '../store/useMenuStore';
import { cleanSectionName, groupMenuBySection, reorderSection, sectionNames } from './menuSections';

const dish = (id: string, section?: string): Dish => ({ id, name: id, section, ingredients: [{ id: Number(id.replace(/\D/g, '')) || 1, name: 'Ingrediente', allergens: [], allergensReviewed: true }] });

test('agrupa secciones normalizadas y deja otros al final', () => {
  const menu = [dish('1', ' Postres '), dish('2'), dish('3', 'PÓSTRES'), dish('4', 'Tapas')];
  assert.deepEqual(sectionNames(menu), ['Postres', 'Tapas']);
  const groups = groupMenuBySection(menu);
  assert.deepEqual(groups.map(group => group.name), ['Postres', 'Tapas', null]);
  assert.deepEqual(groups[0].dishes.map(item => item.id), ['1', '3']);
  assert.deepEqual(reorderSection(menu, 'Tapas', -1).map(item => item.id), ['4', '1', '3', '2']);
  assert.equal(cleanSectionName('  Menú   del día '), 'Menú del día');
});

test('mantiene plana una carta antigua sin secciones', () => {
  const menu = [dish('1'), dish('2')];
  assert.deepEqual(groupMenuBySection(menu), [{ key: '', name: null, dishes: menu }]);
});
