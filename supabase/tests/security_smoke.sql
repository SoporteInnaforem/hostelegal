-- Run with psql against a LOCAL Supabase after applying baseline and migrations.
-- Rolls back all fixture data. Never intended as a production seed.
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('10000000-0000-0000-0000-000000000001','smoke-menu@example.test','{}'),
 ('10000000-0000-0000-0000-000000000002','smoke-other@example.test','{}');
UPDATE public.empresas SET fecha_caducidad_suscripcion = now() + interval '1 day'
 WHERE id IN ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
DO $$ BEGIN
 BEGIN UPDATE public.empresas SET es_admin = true WHERE id = auth.uid(); RAISE EXCEPTION 'Privilege escalation succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.empresas SET documentos_generados = 0 WHERE id = auth.uid(); RAISE EXCEPTION 'Quota mutation succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.guardar_borrador_carta('[]','Test','10000000-0000-0000-0000-000000000002'); RAISE EXCEPTION 'Owner bypass succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.guardar_borrador_carta('[]','Draft','10000000-0000-0000-0000-000000000001');
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.cartas WHERE publicado) THEN RAISE EXCEPTION 'Draft published automatically'; END IF;
END $$;
SELECT public.publicar_carta('[{"id":"dish-1","name":"Plato","ingredients":[{"id":1,"name":"Ingrediente","allergens":[],"allergensReviewed":true}]}]','Published','10000000-0000-0000-0000-000000000001');
SELECT public.guardar_borrador_carta('[]','Private draft','10000000-0000-0000-0000-000000000001');
DO $$ BEGIN
 IF (SELECT nombre_carta FROM public.cartas WHERE empresa_id = auth.uid()) <> 'Published' THEN RAISE EXCEPTION 'Draft overwrote publication'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.cartas WHERE empresa_id = '10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Other owner draft leaked'; END IF;
 BEGIN PERFORM public.registrar_envio_documental(auth.uid(),'forged-event'); RAISE EXCEPTION 'Client changed quota';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ DECLARE carta_id uuid; result record; BEGIN
 SELECT id INTO carta_id FROM public.cartas WHERE empresa_id = '10000000-0000-0000-0000-000000000001';
 SELECT * INTO result FROM public.obtener_carta_publica(carta_id);
 IF result.nombre_carta <> 'Published' OR jsonb_array_length(result.platos) <> 1 THEN RAISE EXCEPTION 'Public RPC exposed draft'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.cartas; RAISE EXCEPTION 'Anonymous table read allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ DECLARE result jsonb; BEGIN
 result := public.registrar_envio_documental('10000000-0000-0000-0000-000000000001','smoke-event');
 result := public.registrar_envio_documental('10000000-0000-0000-0000-000000000001','smoke-event');
 IF result->>'duplicate' <> 'true' OR result->>'documentos_generados' <> '1' THEN RAISE EXCEPTION 'Idempotency failed'; END IF;
END $$;
ROLLBACK;

