import type { Dish } from '../store/useMenuStore';
import { normalizeText } from './normalizeText';

export const MAX_MENU_SECTIONS = 30;
export const MAX_SECTION_NAME = 60;
export const DEFAULT_SECTION_SUGGESTIONS = ['Desayunos', 'Entrantes', 'Tapas', 'Mediodía', 'Platos principales', 'Postres', 'Bebidas'];

export interface MenuSectionGroup {
  key: string;
  name: string | null;
  dishes: Dish[];
}

export function cleanSectionName(value: string | undefined): string | undefined {
  const cleaned = value?.trim().replace(/\s+/g, ' ');
  return cleaned || undefined;
}

export function sectionKey(value: string | undefined): string {
  return value ? normalizeText(value) : '';
}

export function sectionNames(menu: Dish[]): string[] {
  const names = new Map<string, string>();
  for (const dish of menu) {
    const name = cleanSectionName(dish.section);
    if (name && !names.has(sectionKey(name))) names.set(sectionKey(name), name);
  }
  return [...names.values()];
}

export function groupMenuBySection(menu: Dish[]): MenuSectionGroup[] {
  if (!menu.some(dish => cleanSectionName(dish.section))) return [{ key: '', name: null, dishes: menu }];
  const groups = new Map<string, MenuSectionGroup>();
  const unsectioned: Dish[] = [];
  for (const dish of menu) {
    const name = cleanSectionName(dish.section);
    if (!name) { unsectioned.push(dish); continue; }
    const key = sectionKey(name);
    const group = groups.get(key);
    if (group) group.dishes.push(dish);
    else groups.set(key, { key, name, dishes: [dish] });
  }
  const result = [...groups.values()];
  if (unsectioned.length) result.push({ key: '', name: null, dishes: unsectioned });
  return result;
}

export function reorderSection(menu: Dish[], name: string, direction: -1 | 1): Dish[] {
  const groups = groupMenuBySection(menu);
  const named = groups.filter(group => group.name);
  const index = named.findIndex(group => group.key === sectionKey(name));
  const target = index + direction;
  if (index < 0 || target < 0 || target >= named.length) return menu;
  [named[index], named[target]] = [named[target], named[index]];
  const unsectioned = groups.find(group => !group.name);
  return [...named.flatMap(group => group.dishes), ...(unsectioned?.dishes ?? [])];
}
