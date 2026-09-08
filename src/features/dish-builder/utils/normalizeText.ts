/** Normaliza texto para búsquedas y comparaciones tolerantes a tildes y mayúsculas. */
export function normalizeText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ');
}
