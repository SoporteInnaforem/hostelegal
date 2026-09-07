import type { Workbook } from 'exceljs';
import type { Dish, Ingredient } from '../store/useMenuStore';
import { ALLERGEN_LABEL, type AllergenId } from './allergens';

export const IMPORT_LIMITS = { bytes: 2 * 1024 * 1024, rows: 2000, dishes: 300, ingredients: 100 };
const ARCHIVE_LIMITS = { entries: 100, entryBytes: 8 * 1024 * 1024, totalBytes: 20 * 1024 * 1024 };
export interface ImportIssue { row: number; message: string }
export interface MenuImportResult { dishes: Dish[]; errors: ImportIssue[]; pending: number }
export const normalizeImportName = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ');
const allergenNames = new Map<string, AllergenId>(Object.entries(ALLERGEN_LABEL).flatMap(([id, label]) => [[normalizeImportName(id), id as AllergenId], [normalizeImportName(label), id as AllergenId]]));

/** Pure validation; no persistence and no catalogue inference. Row numbers match Excel. */
export function parseMenuRows(rows: unknown[][], existingMenu: Dish[] = []): MenuImportResult {
  const result: MenuImportResult = { dishes: [], errors: [], pending: 0 };
  const error = (row: number, message: string) => result.errors.push({ row, message });
  if (rows.length > IMPORT_LIMITS.rows + 1) { error(0, 'El archivo supera las 2000 filas de datos.'); return result; }
  const header = rows[0] ?? [];
  if (header.length !== 3 || header.some((v, i) => typeof v !== 'string' || normalizeImportName(v) !== ['plato', 'ingrediente', 'alergenos'][i])) {
    error(1, 'Usa exactamente las columnas Plato, Ingrediente y Alérgenos, en ese orden.'); return result;
  }
  const existing = new Set(existingMenu.map(d => normalizeImportName(d.name)));
  const usedIds = new Set(existingMenu.flatMap(d => d.ingredients.map(i => i.id)));
  const groups = new Map<string, Dish>();
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index];
    const line = index + 1;
    if (row.every(v => v == null || (typeof v === 'string' && !v.trim()))) continue;
    if (row.length > 3 && row.slice(3).some(v => v != null && v !== '')) { error(line, 'Hay datos fuera de las tres columnas de la plantilla.'); continue; }
    if (row.slice(0, 3).some(v => v != null && typeof v !== 'string')) { error(line, 'Solo se admite texto; elimina fórmulas, fechas, números y otros objetos.'); continue; }
    const [name, ingredientName, rawAllergens] = [0, 1, 2].map(i => ((row[i] ?? '') as string).trim());
    if (!name || !ingredientName) { error(line, 'Plato e ingrediente son obligatorios en cada fila.'); continue; }
    if (name.length > 120 || ingredientName.length > 120 || rawAllergens.length > 500) { error(line, 'Máximo 120 caracteres por nombre y 500 para alérgenos.'); continue; }
    if (normalizeImportName(name).startsWith('ejemplo:')) { error(line, 'Sustituye o elimina las filas de ejemplo antes de importar.'); continue; }
    const key = normalizeImportName(name);
    if (existing.has(key)) { error(line, `El plato «${name}» ya existe en tu carta. Cambia el nombre o elimina estas filas.`); continue; }
    const tokens = rawAllergens ? rawAllergens.split(';').map(normalizeImportName) : [];
    if (tokens.includes('ninguno') && tokens.length !== 1) { error(line, '«Ninguno» no puede combinarse con otros alérgenos.'); continue; }
    const unknown = tokens.filter(t => t !== 'ninguno' && !allergenNames.has(t));
    if (unknown.length) { error(line, `Alérgenos no reconocidos: ${unknown.map(t => t || '(valor vacío)').join(', ')}. Sepáralos con punto y coma (;).`); continue; }
    let dish = groups.get(key);
    if (!dish) {
      if (groups.size >= IMPORT_LIMITS.dishes) { error(line, 'Máximo 300 platos por importación.'); continue; }
      dish = { id: crypto.randomUUID(), name, ingredients: [] }; groups.set(key, dish);
    }
    if (dish.ingredients.some(i => normalizeImportName(i.name) === normalizeImportName(ingredientName))) { error(line, `Ingrediente repetido en «${dish.name}»: ${ingredientName}.`); continue; }
    if (dish.ingredients.length >= IMPORT_LIMITS.ingredients) { error(line, `«${dish.name}» supera los 100 ingredientes.`); continue; }
    let id: number;
    do { const random = crypto.getRandomValues(new Uint32Array(2)); id = (random[0] & 0x1fffff) * 0x100000000 + random[1]; } while (!id || usedIds.has(id));
    usedIds.add(id);
    const ingredient: Ingredient = { id, name: ingredientName, allergens: [...new Set(tokens.filter(t => t !== 'ninguno').map(t => allergenNames.get(t)!))], allergensReviewed: Boolean(rawAllergens) };
    dish.ingredients.push(ingredient);
    if (!ingredient.allergensReviewed) result.pending++;
  }
  result.dishes = [...groups.values()];
  if (!result.dishes.length && !result.errors.length) error(0, 'La hoja Carta no contiene ingredientes para importar.');
  return result;
}

export function parseMenuWorkbook(workbook: Workbook, existingMenu: Dish[] = []): MenuImportResult {
  const fail = (message: string): MenuImportResult => ({ dishes: [], pending: 0, errors: [{ row: 0, message }] });
  const sheet = workbook.getWorksheet('Carta');
  if (!sheet) return fail('No se encuentra la hoja «Carta». Descarga y utiliza la plantilla.');
  if (sheet.model.merges?.length) return fail('La hoja Carta contiene celdas combinadas. Sepáralas antes de importar.');
  if (sheet.rowCount > IMPORT_LIMITS.rows + 1) return fail('El archivo supera las 2000 filas de datos.');
  if (sheet.columnCount > 3) return fail('La hoja Carta debe contener únicamente las tres columnas de la plantilla.');
  const rows: unknown[][] = [];
  for (let n = 1; n <= sheet.rowCount; n++) rows.push([1, 2, 3].map(c => sheet.getRow(n).getCell(c).value));
  return parseMenuRows(rows, existingMenu);
}

/** Streams every ZIP entry and aborts before ExcelJS if expanded content is excessive. */
export async function validateXlsxArchive(buffer: ArrayBuffer): Promise<void> {
  const { Unzip, UnzipInflate } = await import('fflate');
  await new Promise<void>((resolve, reject) => {
    let entries = 0;
    let active = 0;
    let total = 0;
    let inputComplete = false;
    let settled = false;
    const fail = (message: string) => {
      if (!settled) { settled = true; reject(new Error(message)); }
    };
    const finish = () => {
      if (!settled && inputComplete && active === 0) { settled = true; resolve(); }
    };
    try {
      const unzip = new Unzip((entry) => {
        entries++;
        if (entries > ARCHIVE_LIMITS.entries) { entry.terminate(); fail('El Excel contiene demasiados archivos internos.'); return; }
        active++;
        let entryBytes = 0;
        entry.ondata = (error, chunk, final) => {
          if (settled) { entry.terminate(); return; }
          if (error) { fail('El archivo Excel está dañado.'); return; }
          entryBytes += chunk.length;
          total += chunk.length;
          if (entryBytes > ARCHIVE_LIMITS.entryBytes || total > ARCHIVE_LIMITS.totalBytes) {
            entry.terminate();
            fail('El contenido descomprimido del Excel supera el límite permitido.');
            return;
          }
          if (final) { active--; finish(); }
        };
        entry.start();
      });
      unzip.register(UnzipInflate);
      unzip.push(new Uint8Array(buffer), true);
      inputComplete = true;
      finish();
    } catch {
      fail('El archivo Excel está dañado.');
    }
  });
}

export async function readMenuFile(file: File, existingMenu: Dish[]): Promise<MenuImportResult> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Selecciona un archivo .xlsx. Otros formatos no están admitidos.');
  if (!file.size || file.size > IMPORT_LIMITS.bytes) throw new Error('El archivo debe tener contenido y ocupar como máximo 2 MB.');
  const buffer = await file.arrayBuffer();
  await validateXlsxArchive(buffer);
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(buffer); }
  catch { throw new Error('No se ha podido leer el Excel. Comprueba que sea un .xlsx válido y no esté protegido con contraseña.'); }
  return parseMenuWorkbook(workbook, existingMenu);
}

export async function createMenuTemplateBuffer() {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Carta');
  sheet.columns = [{ header: 'Plato', width: 36 }, { header: 'Ingrediente', width: 32 }, { header: 'Alérgenos', width: 48 }];
  sheet.addRows([['EJEMPLO: Ensalada (borrar)', 'Tomate', 'Ninguno'], ['EJEMPLO: Ensalada (borrar)', 'Queso', 'Lácteos'], ['EJEMPLO: Tostada (borrar)', 'Pan', 'Gluten; Sésamo']]);
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B61' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const instructions = workbook.addWorksheet('Instrucciones');
  instructions.getColumn(1).width = 115;
  instructions.addRows([
    ['IMPORTAR CARTA — HOSTELEGAL'],
    ['Borra las filas de EJEMPLO de Carta y escribe tus datos. Una fila por ingrediente. Repite el nombre del plato en cada fila.'],
    ['Conserva la hoja Carta y sus tres cabeceras. No uses fórmulas ni celdas combinadas.'],
    ['Alérgenos: separa los valores con punto y coma (;). Escribe Ninguno solo si has revisado su ausencia.'],
    ['Alérgenos en blanco: pendiente de revisión. Podrás importar, pero deberás revisarlos antes de publicar o generar el PDF.'],
    [`Valores admitidos: ${Object.values(ALLERGEN_LABEL).join('; ')}; Ninguno.`],
    ['Consulta las fichas y etiquetas reales de tus ingredientes. La aplicación no deduce alérgenos del nombre.'],
    ['La importación añade platos. No sustituye platos existentes; los nombres repetidos se rechazan.'],
    ['Límites: .xlsx, 2 MB, 2000 filas de datos, 300 platos por archivo y 100 ingredientes por plato.'],
  ]);
  instructions.getRow(1).font = { bold: true, size: 16 };
  instructions.eachRow(row => { row.alignment = { wrapText: true, vertical: 'top' }; row.height = 38; });
  return workbook.xlsx.writeBuffer();
}

export async function downloadMenuTemplate() {
  const buffer = await createMenuTemplateBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a'); link.href = url; link.download = 'Plantilla_carta_Hostelegal.xlsx'; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
