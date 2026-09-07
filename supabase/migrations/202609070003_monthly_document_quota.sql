-- Calendar months in Europe/Madrid. Preserve the existing counter on rollout:
-- historical browser increments have no timestamp and cannot be reconstructed.
BEGIN;
ALTER TABLE public.empresas ADD COLUMN documentos_mes date NOT NULL
 DEFAULT date_trunc('month', now() AT TIME ZONE 'Europe/Madrid')::date;

CREATE OR REPLACE FUNCTION public.consultar_cuota_documental()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE empresa public.empresas%ROWTYPE;
 mes date := date_trunc('month', now() AT TIME ZONE 'Europe/Madrid')::date;
 usados integer;
BEGIN
 SELECT * INTO empresa FROM public.empresas WHERE id = auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no disponible.' USING ERRCODE = '42501'; END IF;
 usados := CASE WHEN empresa.documentos_mes = mes THEN coalesce(empresa.documentos_generados,0) ELSE 0 END;
 RETURN jsonb_build_object('documentos_generados',usados,'limite',5,'mes',mes);
END $$;
REVOKE ALL ON FUNCTION public.consultar_cuota_documental() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consultar_cuota_documental() TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_clientes_cuota_mensual()
RETURNS SETOF public.empresas LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE empresa public.empresas%ROWTYPE;
 mes date := date_trunc('month', now() AT TIME ZONE 'Europe/Madrid')::date;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado.' USING ERRCODE = '42501'; END IF;
 FOR empresa IN SELECT * FROM public.empresas WHERE NOT es_admin ORDER BY fecha_caducidad_suscripcion LOOP
  IF empresa.documentos_mes <> mes THEN empresa.documentos_generados := 0; END IF;
  RETURN NEXT empresa;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.listar_clientes_cuota_mensual() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_clientes_cuota_mensual() TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_envio_documental(p_empresa_id uuid, p_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE empresa public.empresas%ROWTYPE; event_owner uuid;
 mes date := date_trunc('month', now() AT TIME ZONE 'Europe/Madrid')::date;
 usados integer;
BEGIN
 IF p_event_id IS NULL OR length(btrim(p_event_id)) = 0 OR length(p_event_id) > 200 THEN RAISE EXCEPTION 'Identificador de envío no válido.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id, 0));
 SELECT * INTO empresa FROM public.empresas WHERE id = p_empresa_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('accepted',false,'reason','unknown_company'); END IF;
 usados := CASE WHEN empresa.documentos_mes = mes THEN coalesce(empresa.documentos_generados,0) ELSE 0 END;
 SELECT empresa_id INTO event_owner FROM public.envios_documentales WHERE event_id = p_event_id;
 IF FOUND THEN
  IF event_owner <> p_empresa_id THEN RETURN jsonb_build_object('accepted',false,'reason','event_conflict'); END IF;
  RETURN jsonb_build_object('accepted',true,'duplicate',true,'documentos_generados',usados);
 END IF;
 IF empresa.fecha_caducidad_suscripcion IS NOT NULL AND empresa.fecha_caducidad_suscripcion <= now() THEN
  RETURN jsonb_build_object('accepted',false,'reason','expired_subscription');
 END IF;
 IF usados >= 5 THEN RETURN jsonb_build_object('accepted',false,'reason','quota_exceeded'); END IF;
 INSERT INTO public.envios_documentales(event_id,empresa_id) VALUES(p_event_id,p_empresa_id);
 UPDATE public.empresas SET documentos_generados = usados + 1, documentos_mes = mes WHERE id = p_empresa_id;
 RETURN jsonb_build_object('accepted',true,'duplicate',false,'documentos_generados',usados + 1);
END $$;
REVOKE ALL ON FUNCTION public.registrar_envio_documental(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_envio_documental(uuid,text) TO service_role;
-- App-only reporting of a Tally submission. This is not proof of PDF generation.
CREATE OR REPLACE FUNCTION public.registrar_envio_tally(p_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado.' USING ERRCODE = '42501'; END IF;
 RETURN public.registrar_envio_documental(auth.uid(), p_event_id);
END $$;
REVOKE ALL ON FUNCTION public.registrar_envio_tally(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_envio_tally(text) TO authenticated;
COMMIT;
