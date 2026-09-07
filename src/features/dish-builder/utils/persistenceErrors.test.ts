import test from 'node:test';
import assert from 'node:assert/strict';
import { menuLoadErrorMessage, menuSaveErrorMessage } from './persistenceErrors';

test('identifies a pending database migration from PostgREST and PostgreSQL errors', () => {
  for (const error of [
    { code: 'PGRST204', message: "Could not find the 'borrador_platos' column" },
    { code: '42703', message: 'column does not exist' },
    { code: 'PGRST202', message: 'Could not find guardar_borrador_carta in the schema cache' },
  ]) {
    assert.match(menuLoadErrorMessage(error), /actualización.*pendiente/i);
    assert.match(menuSaveErrorMessage(error), /actualización.*pendiente/i);
  }
});

test('reports duplicate menus and preserves safe validation errors', () => {
  assert.match(menuLoadErrorMessage({ code: 'PGRST116' }), /más de una carta/i);
  const validationError = new Error('Hay un plato guardado con datos inválidos. Contacta con soporte.');
  assert.equal(menuLoadErrorMessage(validationError), validationError.message);
});

test('uses the generic retry message for unknown failures', () => {
  assert.match(menuLoadErrorMessage(new Error('Failed to fetch')), /Reintenta antes de editar/);
  assert.match(menuSaveErrorMessage(new Error('Failed to fetch')), /Comprueba la conexión/);
});
