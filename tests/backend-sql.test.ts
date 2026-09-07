import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const owner = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const reviewed = [{ id: 'dish', name: 'Plato', ingredients: [{ id: 1, name: 'Arroz', allergens: [], allergensReviewed: true }] }];
const setup = `
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon,authenticated,service_role;
`;
async function database(legacy = false) {
 const db = new PGlite();
 await db.exec(setup);
 const schema = await readFile(new URL('../DATABASE_SCHEMA.sql', import.meta.url), 'utf8');
 await db.exec(legacy ? schema.split('-- CURRENT SCHEMA:')[0] : schema);
 return db;
}
async function fixtures(db: PGlite) {
 await db.query(`INSERT INTO auth.users VALUES ($1,'owner@example.test','{}'),($2,'other@example.test','{}')`, [owner,other]);
 await db.exec(`UPDATE public.empresas SET fecha_caducidad_suscripcion=now()+interval '1 day'`);
}
async function asOwner(db: PGlite, id = owner) {
 await db.exec('RESET ROLE');
 await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`, [id]);
 await db.exec('SET ROLE authenticated');
}

test('menu permissions, draft isolation and explicit reviewed publication', async () => {
 const db = await database();
 try {
  await fixtures(db);
  await asOwner(db);
  await assert.rejects(db.exec(`UPDATE empresas SET es_admin=true WHERE id=auth.uid()`), /permission denied/);
  await assert.rejects(db.exec(`UPDATE empresas SET fecha_caducidad_suscripcion=now()+interval '5 years' WHERE id=auth.uid()`), /permission denied/);
  await assert.rejects(db.exec(`UPDATE empresas SET documentos_generados=0 WHERE id=auth.uid()`), /permission denied/);
  await assert.rejects(db.query(`SELECT guardar_borrador_carta('[]','Test',$1)`, [other]), /Sesión o suscripción/);
  const duplicateIngredients = [{ ...reviewed[0], ingredients: [reviewed[0].ingredients[0], reviewed[0].ingredients[0]] }];
  await assert.rejects(db.query('SELECT guardar_borrador_carta($1,$2,$3)', [JSON.stringify(duplicateIngredients), 'Invalid', owner]), /ingredientes repetidos/);
  const decimalIngredient = [{ ...reviewed[0], ingredients: [{ ...reviewed[0].ingredients[0], id: 1.5 }] }];
  await assert.rejects(db.query('SELECT guardar_borrador_carta($1,$2,$3)', [JSON.stringify(decimalIngredient), 'Invalid', owner]), /Ingrediente no válido/);
  const result = await db.query<{id:string}>(`SELECT guardar_borrador_carta('[]','Private',$1) AS id`, [owner]);
  const id = result.rows[0].id;
  await db.exec('SET ROLE anon');
  await assert.rejects(db.exec('SELECT * FROM cartas'), /permission denied/);
  assert.equal((await db.query('SELECT * FROM obtener_carta_publica($1)',[id])).rows.length,0);
  await asOwner(db);
  const pending = [{ ...reviewed[0], ingredients: [{...reviewed[0].ingredients[0],allergensReviewed:false}] }];
  await assert.rejects(db.query('SELECT publicar_carta($1,$2,$3)',[JSON.stringify(pending),'Published',owner]), /Revisa los alérgenos/);
  await db.query('SELECT publicar_carta($1,$2,$3)',[JSON.stringify(reviewed),'Published',owner]);
  await db.query(`SELECT guardar_borrador_carta('[]','Secret',$1)`,[owner]);
  await asOwner(db,other);
  assert.equal((await db.query('SELECT * FROM cartas')).rows.length,0);
  const publicResult = await db.query<{nombre_carta:string;platos:unknown[]}>('SELECT * FROM obtener_carta_publica($1)',[id]);
  assert.equal(publicResult.rows[0].nombre_carta,'Published');
  assert.deepEqual(publicResult.rows[0].platos,reviewed);
  await db.exec('SET ROLE anon');
  assert.equal((await db.query('SELECT * FROM obtener_carta_publica($1)',[id])).rows.length,1);
  await db.exec('RESET ROLE');
  await db.query(`UPDATE empresas SET fecha_caducidad_suscripcion=now()-interval '1 day' WHERE id=$1`,[owner]);
  await asOwner(db);
  await assert.rejects(db.query(`SELECT guardar_borrador_carta('[]','Expired',$1)`,[owner]), /Sesión o suscripción/);
 } finally { await db.close(); }
});

test('document quota rejects client calls, counts unique events and caps at five', async () => {
 const db = await database();
 try {
  await fixtures(db); await asOwner(db);
  await assert.rejects(db.query('SELECT registrar_envio_documental($1,$2)',[owner,'event']),/permission denied/);
  await db.exec('SET ROLE service_role');
  const reserve = async (event: string) => (await db.query<{result:{accepted:boolean;duplicate?:boolean;reason?:string;documentos_generados?:number}}>('SELECT registrar_envio_documental($1,$2) AS result',[owner,event])).rows[0].result;
  assert.deepEqual(await reserve('event'), {accepted:true,duplicate:false,documentos_generados:1});
  assert.deepEqual(await reserve('event'), {accepted:true,duplicate:true,documentos_generados:1});
  for(let i=2;i<=5;i++) assert.equal((await reserve(`event-${i}`)).accepted,true);
  assert.deepEqual(await reserve('event-6'),{accepted:false,reason:'quota_exceeded'});
 } finally { await db.close(); }
});

test('migration refuses duplicate owners without deleting any legacy data', async () => {
 const db = await database(true);
 try {
  await fixtures(db);
  await db.query(`INSERT INTO cartas(empresa_id,nombre_carta) VALUES($1,'A'),($1,'B')`,[owner]);
  const migration = await readFile(new URL('../supabase/migrations/202609070001_secure_menu_import.sql',import.meta.url),'utf8');
  await assert.rejects(db.exec(migration),/varias cartas/);
  await db.exec('ROLLBACK');
  const rows = await db.query<{nombre_carta:string}>('SELECT nombre_carta FROM cartas ORDER BY nombre_carta');
  assert.deepEqual(rows.rows.map(row=>row.nombre_carta),['A','B']);
 } finally { await db.close(); }
});

