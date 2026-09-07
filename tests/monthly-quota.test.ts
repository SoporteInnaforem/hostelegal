import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('cuota mensual preserva consumo, limita cinco, renueva y no cobra reintentos antiguos', async () => {
 const db = new PGlite();
 const owner = '10000000-0000-0000-0000-000000000001';
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
   CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
   GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;`);
  await db.exec(await readFile(new URL('../DATABASE_SCHEMA.sql',import.meta.url),'utf8'));
  await db.query(`INSERT INTO auth.users VALUES($1,'test@example.test','{}')`,[owner]);
  await db.exec(`UPDATE empresas SET documentos_generados=4,fecha_caducidad_suscripcion=now()+interval '1 year'`);
  await db.exec(await readFile(new URL('../supabase/migrations/202609070003_monthly_document_quota.sql',import.meta.url),'utf8'));
  await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`,[owner]);
  await db.exec('SET ROLE authenticated');
  const quota = async () => (await db.query<{q:{documentos_generados:number}}>('SELECT consultar_cuota_documental() q')).rows[0].q.documentos_generados;
  assert.equal(await quota(),4);
  await assert.rejects(db.query('SELECT registrar_envio_documental($1,$2)',[owner,'forged']),/permission denied/);
  await assert.rejects(db.query('SELECT * FROM listar_clientes_cuota_mensual()'),/No autorizado/);
  await db.exec('SET ROLE service_role');
  const reserve = async (event:string) => (await db.query<{q:{accepted:boolean;duplicate?:boolean;documentos_generados?:number;reason?:string}}>('SELECT registrar_envio_documental($1,$2) q',[owner,event])).rows[0].q;
  assert.equal((await reserve('last-of-month')).documentos_generados,5);
  assert.equal((await reserve('sixth')).reason,'quota_exceeded');
  assert.equal((await reserve('last-of-month')).duplicate,true);
  await db.exec(`RESET ROLE; UPDATE empresas SET documentos_mes=(date_trunc('month',now() AT TIME ZONE 'Europe/Madrid')-interval '1 month')::date`);
  await db.exec('SET ROLE authenticated');
  assert.equal(await quota(),0);
  await db.exec('SET ROLE service_role');
  assert.equal((await reserve('last-of-month')).documentos_generados,0);
  assert.equal((await reserve('next-month')).documentos_generados,1);
  for (let i=2;i<=5;i++) assert.equal((await reserve(`next-${i}`)).documentos_generados,i);
  assert.equal((await reserve('next-6')).reason,'quota_exceeded');
 } finally { await db.close(); }
});
