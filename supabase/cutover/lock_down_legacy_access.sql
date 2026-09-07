-- Apply only when the new frontend is promoted to production.
-- The Preview and old production frontends can coexist until this transaction.
BEGIN;

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.empresas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.empresas TO authenticated;
GRANT UPDATE(nombre_restaurante) ON public.empresas TO authenticated;
DROP POLICY IF EXISTS empresas_select ON public.empresas;
DROP POLICY IF EXISTS empresas_update_own ON public.empresas;
DROP POLICY IF EXISTS empresas_no_insert_from_client ON public.empresas;
DROP POLICY IF EXISTS empresas_no_delete_from_client ON public.empresas;
CREATE POLICY empresas_select ON public.empresas FOR SELECT TO authenticated
 USING (id = auth.uid() OR public.is_admin());
CREATE POLICY empresas_update_own ON public.empresas FOR UPDATE TO authenticated
 USING (id = auth.uid()) WITH CHECK (id = auth.uid());

REVOKE ALL ON public.cartas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cartas TO authenticated;
DROP POLICY IF EXISTS cartas_select ON public.cartas;
DROP POLICY IF EXISTS cartas_insert ON public.cartas;
DROP POLICY IF EXISTS cartas_update ON public.cartas;
DROP POLICY IF EXISTS cartas_delete ON public.cartas;
CREATE POLICY cartas_select ON public.cartas FOR SELECT TO authenticated
 USING (empresa_id = auth.uid() OR public.is_admin());

COMMIT;
