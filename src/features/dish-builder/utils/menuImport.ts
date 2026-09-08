import type { Workbook } from 'exceljs';
import type { Dish, Ingredient } from '../store/useMenuStore';
import { ALLERGEN_LABEL, type AllergenId } from './allergens';
import { normalizeText } from './normalizeText';

export const IMPORT_LIMITS = { bytes: 2 * 1024 * 1024, rows: 2000, dishes: 300, ingredients: 100 };
const ARCHIVE_LIMITS = { entries: 100, entryBytes: 8 * 1024 * 1024, totalBytes: 20 * 1024 * 1024 };
export interface ImportIssue { row: number; message: string }
export interface MenuImportResult { dishes: Dish[]; errors: ImportIssue[]; pending: number }
export const normalizeImportName = normalizeText;
export const DISH_SUMMARY_NAME = 'Alérgenos del plato';
const allergenNames = new Map<string, AllergenId>(Object.entries(ALLERGEN_LABEL).flatMap(([id, label]) => [[normalizeImportName(id), id as AllergenId], [normalizeImportName(label), id as AllergenId]]));
export const CHECK_HEADERS = ['Plato', 'Ingrediente', ...Object.values(ALLERGEN_LABEL), 'Ninguno'];

function readCheck(value: unknown): boolean | null {
  if (value == null || value === false || value === 0) return false;
  if (value === true || value === 1) return true;
  if (typeof value !== 'string') return null;
  const mark = normalizeImportName(value);
  if (['', '☐', 'no', 'false', 'falso', '0'].includes(mark)) return false;
  if (['✓', '✔', '☑', 'x', 'si', 'true', 'verdadero', '1'].includes(mark)) return true;
  return null;
}

/** Pure validation; no persistence and no catalogue inference. Row numbers match Excel. */
export function parseMenuRows(rows: unknown[][], existingMenu: Dish[] = []): MenuImportResult {
  const result: MenuImportResult = { dishes: [], errors: [], pending: 0 };
  const error = (row: number, message: string) => result.errors.push({ row, message });
  if (rows.length > IMPORT_LIMITS.rows + 1) { error(0, 'El archivo supera las 2000 filas de datos.'); return result; }
  const header = rows[0] ?? [];
  if (header.length === CHECK_HEADERS.length && header.every((v, i) => typeof v === 'string' && normalizeImportName(v) === normalizeImportName(CHECK_HEADERS[i]))) {
    const converted: unknown[][] = [['Plato', 'Ingrediente', 'Alérgenos']];
    rows.slice(1).forEach((row, index) => {
      const marks = CHECK_HEADERS.slice(2).map((_, i) => readCheck(row[i + 2]));
      const invalid = marks.findIndex(mark => mark === null);
      if (invalid >= 0 || row.slice(CHECK_HEADERS.length).some(v => v != null && v !== '')) {
        error(index + 2, invalid >= 0 ? `Marca no válida en «${CHECK_HEADERS[invalid + 2]}». Usa ✓, X, Sí o deja la celda vacía; no uses fórmulas.` : 'Hay datos fuera de las columnas de la plantilla.');
        converted.push([]);
      } else {
        converted.push([row[0], row[1], CHECK_HEADERS.slice(2).filter((_, i) => marks[i]).join('; ')]);
      }
    });
    const parsed = parseMenuRows(converted, existingMenu);
    return { ...parsed, errors: [...result.errors, ...parsed.errors.filter(e => e.row !== 0 || !result.errors.length)].sort((a, b) => a.row - b.row) };
  }
  if (header.length !== 3 || header.some((v, i) => typeof v !== 'string' || normalizeImportName(v) !== ['plato', 'ingrediente', 'alergenos'][i])) {
    error(1, 'Conserva las cabeceras de la plantilla: Plato, Ingrediente, los 14 alérgenos y Ninguno. También se admite la plantilla antigua de tres columnas.'); return result;
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
    if (!name) { error(line, 'El plato es obligatorio en cada fila.'); continue; }
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
    const storedIngredientName = ingredientName || DISH_SUMMARY_NAME;
    if (dish.ingredients.some(i => normalizeImportName(i.name) === normalizeImportName(storedIngredientName))) { error(line, ingredientName ? `Ingrediente repetido en «${dish.name}»: ${ingredientName}.` : `«${dish.name}» tiene más de una fila sin ingrediente.`); continue; }
    if (dish.ingredients.length >= IMPORT_LIMITS.ingredients) { error(line, `«${dish.name}» supera los 100 ingredientes.`); continue; }
    let id: number;
    do { const random = crypto.getRandomValues(new Uint32Array(2)); id = (random[0] & 0x1fffff) * 0x100000000 + random[1]; } while (!id || usedIds.has(id));
    usedIds.add(id);
    const ingredient: Ingredient = { id, name: storedIngredientName, allergens: [...new Set(tokens.filter(t => t !== 'ninguno').map(t => allergenNames.get(t)!))], allergensReviewed: Boolean(rawAllergens), ...(ingredientName ? {} : { isDishSummary: true }) };
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
  if (sheet.columnCount > CHECK_HEADERS.length) return fail('La hoja Carta contiene columnas fuera de la plantilla.');
  const rows: unknown[][] = [];
  for (let n = 1; n <= sheet.rowCount; n++) rows.push(Array.from({ length: sheet.columnCount }, (_, c) => sheet.getRow(n).getCell(c + 1).value));
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

async function createMenuWorkbook(includeExamples: boolean) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Carta');
  sheet.columns = CHECK_HEADERS.map((header, i) => ({ header, width: i < 2 ? 30 : 13 }));
  const example = (dish: string, ingredient: string, labels: string[]) => [dish, ingredient, ...CHECK_HEADERS.slice(2).map(label => labels.includes(label) ? '✓' : '')];
  if (includeExamples) sheet.addRows([example('EJEMPLO: Ensalada (borrar)', 'Tomate', ['Ninguno']), example('EJEMPLO: Ensalada (borrar)', 'Queso', ['Lácteos']), example('EJEMPLO: Tostada (borrar)', 'Pan', ['Gluten', 'Sésamo'])]);
  for (let row = 2; row <= IMPORT_LIMITS.rows + 1; row++) {
    for (let column = 3; column <= CHECK_HEADERS.length; column++) {
      const cell = sheet.getCell(row, column);
      cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"✓,☐"'], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Marca no válida', error: 'Selecciona ✓ para marcar o ☐ para desmarcar.' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }
  sheet.getRow(1).height = 48;
  sheet.getRow(1).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B61' } };
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 2 }];
  const instructions = workbook.addWorksheet('Instrucciones');
  instructions.getColumn(1).width = 115;
  instructions.addRows([
    ['IMPORTAR CARTA — HOSTELEGAL'],
    ['Borra las filas de EJEMPLO de Carta y escribe tus datos. Repite el nombre del plato en cada fila.'],
    ['Puedes dejar Ingrediente vacío e indicar directamente los alérgenos del plato. Si incluyes ingredientes, usa una fila por ingrediente.'],
    ['Conserva la hoja Carta y todas sus cabeceras. No uses fórmulas ni celdas combinadas.'],
    ['Marca ✓ en la columna de cada alérgeno presente. Selecciona la marca con el desplegable de la celda. Puedes marcar varios.'],
    ['Marca Ninguno solo si has confirmado la ausencia de alérgenos. No lo combines con otras marcas.'],
    ['Para desmarcar, borra la celda o selecciona ☐. También se leen X, Sí y valores verdadero/falso de casillas en celda.'],
    ['Sin ninguna marca: pendiente de revisión antes de publicar o generar el PDF.'],
    [`Valores admitidos: ${Object.values(ALLERGEN_LABEL).join('; ')}; Ninguno.`],
    ['Consulta las fichas y etiquetas reales de tus ingredientes. La aplicación no deduce alérgenos del nombre.'],
    ['La importación añade platos. No sustituye platos existentes; los nombres repetidos se rechazan.'],
    ['Límites: .xlsx, 2 MB, 2000 filas de datos, 300 platos por archivo y 100 ingredientes por plato.'],
  ]);
  instructions.getRow(1).font = { bold: true, size: 16 };
  instructions.eachRow(row => { row.alignment = { wrapText: true, vertical: 'top' }; row.height = 38; });
  return workbook;
}

export async function createMenuTemplateBuffer() {
  const workbook = await createMenuWorkbook(true);
  return workbook.xlsx.writeBuffer();
}

export async function createMenuExportBuffer(menu: Dish[]) {
  const workbook = await createMenuWorkbook(false);
  const sheet = workbook.getWorksheet('Carta')!;
  const rows = menu.flatMap(dish => dish.ingredients.map(ingredient => {
    const marked = new Set<string>(ingredient.allergens.map(id => ALLERGEN_LABEL[id]));
    if (ingredient.allergensReviewed && ingredient.allergens.length === 0) marked.add('Ninguno');
    return [dish.name, ingredient.isDishSummary ? '' : ingredient.name, ...CHECK_HEADERS.slice(2).map(label => marked.has(label) ? '✓' : '')];
  }));
  rows.forEach((row, index) => { sheet.getRow(index + 2).values = row; });
  return workbook.xlsx.writeBuffer();
}

function downloadBuffer(buffer: ArrayBuffer | ArrayBufferView, fileName: string) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadMenuTemplate() {
  const buffer = await createMenuTemplateBuffer();
  downloadBuffer(buffer, 'Plantilla_carta_Hostelegal.xlsx');
}

export async function downloadMenuExcel(menu: Dish[], restaurantName: string) {
  const buffer = await createMenuExportBuffer(menu);
  const safeName = normalizeImportName(restaurantName).replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '') || 'carta';
  downloadBuffer(buffer, `Carta_${safeName}.xlsx`);
}
