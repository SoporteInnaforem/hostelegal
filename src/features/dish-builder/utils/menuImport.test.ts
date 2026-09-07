import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { zipSync } from 'fflate';
import { createMenuTemplateBuffer, parseMenuRows, parseMenuWorkbook, readMenuFile, validateXlsxArchive } from './menuImport';

const header = ['Plato', 'Ingrediente', 'Alérgenos'];
test('agrupa platos sin distinguir acentos y conserva revisión explícita', () => {
  const result = parseMenuRows([header, ['Ensaláda', 'Tomate', 'Ninguno'], [' ENSALADA ', 'Queso', 'Lácteos; GLUTEN'], ['Sopa', 'Caldo', '']]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.dishes.length, 2);
  assert.equal(result.dishes[0].ingredients.length, 2);
  assert.equal(result.dishes[0].ingredients[0].allergensReviewed, true);
  assert.deepEqual(result.dishes[0].ingredients[1].allergens, ['LACTEOS', 'GLUTEN']);
  assert.equal(result.dishes[1].ingredients[0].allergensReviewed, false);
  assert.equal(result.pending, 1);
  const ids = result.dishes.flatMap(d => d.ingredients.map(i => i.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(Number.isSafeInteger));
});
test('errores indican filas originales y no aceptan desconocidos ni fórmulas', () => {
  const result = parseMenuRows([header, [], ['Sopa', 'Caldo', 'Leche'], ['Pan', { formula: 'A1', result: 'Trigo' }, 'Gluten'], ['Sopa', '', ''], ['Sopa', 'Caldo', 'Ninguno; Apio']]);
  assert.deepEqual(result.errors.map(e => e.row), [3, 4, 5, 6]);
});
test('no sustituye platos existentes ni duplica ingredientes normalizados', () => {
  const existing = [{ id: 'original', name: 'Sopá', ingredients: [] }];
  const result = parseMenuRows([header, ['Sopa', 'Caldo', 'Ninguno'], ['Pan', 'Trigo', 'Gluten'], ['Pan', ' TRÍGO ', 'Gluten']], existing);
  assert.deepEqual(result.errors.map(e => e.row), [2, 4]);
  assert.equal(existing[0].ingredients.length, 0);
});
test('rechaza cabeceras, contenido vacío, ejemplos y columnas adicionales', () => {
  for (const rows of [[['Comida', 'Ingrediente', 'Alérgenos']], [header], [header, ['EJEMPLO: Sopa', 'Caldo', 'Ninguno']], [header, ['Sopa', 'Caldo', '', 'extra']]]) assert.ok(parseMenuRows(rows).errors.length);
});
test('rechaza límites de filas, platos, ingredientes y nombres', () => {
  assert.ok(parseMenuRows([header, ...Array.from({ length: 2001 }, () => [])]).errors.length);
  assert.ok(parseMenuRows([header, ...Array.from({ length: 301 }, (_, n) => [`Plato ${n}`, 'Sal', 'Ninguno'])]).errors.length);
  assert.ok(parseMenuRows([header, ...Array.from({ length: 101 }, (_, n) => ['Sopa', `Ingrediente ${n}`, 'Ninguno'])]).errors.length);
  assert.ok(parseMenuRows([header, ['x'.repeat(121), 'Sal', 'Ninguno']]).errors.length);
});
test('valida workbook real, merges y hoja obligatoria', async () => {
  const workbook = new ExcelJS.Workbook();
  assert.ok(parseMenuWorkbook(workbook).errors.length);
  const sheet = workbook.addWorksheet('Carta');
  sheet.addRows([header, ['Sopa', 'Caldo', '']]);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.equal(parseMenuWorkbook(loaded).pending, 1);
  sheet.mergeCells('A2:A3');
  assert.match(parseMenuWorkbook(workbook).errors[0].message, /combinadas/);
});
test('rechaza formato, tamaño y archivo corrupto antes de importar', async () => {
  await assert.rejects(readMenuFile(new File(['abc'], 'carta.csv'), []), /\.xlsx/);
  await assert.rejects(readMenuFile(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'carta.xlsx'), []), /2 MB/);
  await assert.rejects(readMenuFile(new File(['invalid'], 'carta.xlsx'), []), /(dañado|leer el Excel)/);
});

test('la plantilla descargable abre y exige sustituir sus ejemplos', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await createMenuTemplateBuffer());
  assert.ok(workbook.getWorksheet('Instrucciones'));
  assert.match(parseMenuWorkbook(workbook).errors[0].message, /ejemplo/i);
});

test('rechaza un ZIP pequeño que se expande por encima del límite', async () => {
  const compressed = zipSync({ 'xl/worksheets/sheet1.xml': new Uint8Array(9 * 1024 * 1024) }, { level: 9 });
  assert.ok(compressed.byteLength < 2 * 1024 * 1024);
  await assert.rejects(validateXlsxArchive(compressed.buffer as ArrayBuffer), /descomprimido/);
});
