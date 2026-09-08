import assert from 'node:assert/strict';
import test from 'node:test';
import { publicMenuOrigin, publicMenuUrl } from './publicMenuUrl';

test('a Vercel Preview QR opens the same deployment even when production is configured', () => {
  const preview = 'https://hostelegal-git-feature-secciones-equipo.vercel.app';
  assert.equal(publicMenuOrigin(preview, 'https://cartahostelegal.vercel.app'), preview);
  assert.equal(publicMenuUrl(preview, 'menu-id', 'https://cartahostelegal.vercel.app'), `${preview}/carta/menu-id`);
});

test('local development keeps the QR in the local application', () => {
  assert.equal(publicMenuOrigin('http://localhost:5173', 'https://cartahostelegal.vercel.app'), 'http://localhost:5173');
});

test('stable deployments use the configured public menu origin', () => {
  assert.equal(publicMenuOrigin('https://portal.example.com', 'https://cartas.example.com/'), 'https://cartas.example.com');
});

test('the legacy portal keeps its public-card fallback when no variable is configured', () => {
  assert.equal(publicMenuOrigin('https://portal-hostelegal.vercel.app'), 'https://cartas-portal-hostelegal.vercel.app');
});
