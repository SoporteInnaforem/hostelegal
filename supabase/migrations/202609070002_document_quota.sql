-- Only trusted automation may reserve a document generation. A repeated event is free.
BEGIN;
CREATE TABLE IF NOT EXISTS public.envios_documentales (
 event_id text PRIMARY KEY,
 empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
 creado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.envios_documentales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.envios_documentales FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.registrar_envio_documental(p_empresa_id uuid, p_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE empresa public.empresas%ROWTYPE; event_owner uuid;
BEGIN
 IF p_event_id IS NULL OR length(btrim(p_event_id)) = 0 OR length(p_event_id) > 200 THEN RAISE EXCEPTION 'Identificador de envío no válido.'; END IF;
 -- Serializes requests for an owner; the global advisory lock also serializes shared event IDs.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id, 0));
 SELECT * INTO empresa FROM public.empresas WHERE id = p_empresa_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('accepted',false,'reason','unknown_company'); END IF;
 SELECT empresa_id INTO event_owner FROM public.envios_documentales WHERE event_id = p_event_id;
 IF FOUND THEN
  IF event_owner <> p_empresa_id THEN RETURN jsonb_build_object('accepted',false,'reason','event_conflict'); END IF;
  RETURN jsonb_build_object('accepted',true,'duplicate',true,'documentos_generados',empresa.documentos_generados);
 END IF;
 IF empresa.fecha_caducidad_suscripcion IS NOT NULL AND empresa.fecha_caducidad_suscripcion <= now() THEN
  RETURN jsonb_build_object('accepted',false,'reason','expired_subscription');
 END IF;
 IF empresa.documentos_generados >= 5 THEN RETURN jsonb_build_object('accepted',false,'reason','quota_exceeded'); END IF;
 INSERT INTO public.envios_documentales(event_id,empresa_id) VALUES(p_event_id,p_empresa_id);
 UPDATE public.empresas SET documentos_generados = documentos_generados + 1 WHERE id = p_empresa_id;
 RETURN jsonb_build_object('accepted',true,'duplicate',false,'documentos_generados',empresa.documentos_generados + 1);
END $$;
REVOKE ALL ON FUNCTION public.registrar_envio_documental(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_envio_documental(uuid,text) TO service_role;
COMMIT;
