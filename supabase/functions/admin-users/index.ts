import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Método no permitido' }, 405);
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return response({ error: 'No autorizado' }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(authorization.slice(7));
    if (authError || !user) return response({ error: 'No autorizado' }, 401);
    const { data: caller, error: roleError } = await admin.from('empresas').select('es_admin').eq('id', user.id).maybeSingle();
    if (roleError || !caller?.es_admin) return response({ error: 'No tienes permisos de administrador' }, 403);
    const { action, userData = {}, userId } = await req.json();
    if (!['create_user', 'update_user', 'deactivate_user', 'delete_user'].includes(action)) throw new Error('Acción no válida');
    if (action !== 'create_user') {
      if (typeof userId !== 'string') throw new Error('Identificador requerido');
      const { data: target, error } = await admin.from('empresas').select('es_admin').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (!target || target.es_admin) throw new Error('La acción solo está permitida sobre clientes existentes');
    }
    if (action === 'delete_user') {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return response({ success: true });
    }
    if (action === 'deactivate_user') {
      const { error } = await admin.from('empresas').update({ fecha_caducidad_suscripcion: '2000-01-01T00:00:00Z' }).eq('id', userId);
      if (error) throw error;
      return response({ success: true });
    }
    const { email, password, nombre_restaurante: nombre, documentos_generados: documentos = 0 } = userData;
    const fecha = userData.fecha_caducidad_suscripcion ?? userData.fecha_caducidad;
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email no válido');
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 200) throw new Error('Nombre no válido');
    if (typeof fecha !== 'string' || !Number.isFinite(Date.parse(fecha))) throw new Error('Fecha de caducidad no válida');
    if (!Number.isInteger(documentos) || documentos < 0) throw new Error('Contador no válido');
    if ((action === 'create_user' || password !== undefined) && (typeof password !== 'string' || password.length < 8)) throw new Error('La contraseña debe tener al menos 8 caracteres');
    const profile = { nombre_restaurante: nombre.trim(), fecha_caducidad_suscripcion: new Date(fecha).toISOString(), documentos_generados: documentos };
    if (action === 'create_user') {
      const { data, error } = await admin.auth.admin.createUser({ email: email.trim(), password, email_confirm: true, user_metadata: { nombre_restaurante: nombre.trim() } });
      if (error) throw error;
      const { error: profileError } = await admin.from('empresas').update(profile).eq('id', data.user.id).select('id').single();
      if (profileError) {
        // Compensate only the account just created by this request.
        const { error: rollbackError } = await admin.auth.admin.deleteUser(data.user.id);
        if (rollbackError) throw new Error('Cuenta creada, pero no se pudo guardar el perfil ni revertirla. Revisa la cuenta antes de reintentar.');
        throw profileError;
      }
      return response({ success: true, userId: data.user.id });
    }
    // Email is synchronized transactionally by the auth.users trigger; profile errors
    // remain explicit because the Auth API and REST profile update cannot share a transaction.
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
      email: email.trim(), ...(password ? { password } : {}),
    });
    if (authUpdateError) throw authUpdateError;
    const { error: profileError } = await admin.from('empresas').update(profile).eq('id', userId).select('id').single();
    if (profileError) throw new Error('Credenciales actualizadas, pero no se pudo guardar la suscripción o el perfil. Recarga y vuelve a guardar los datos del cliente.');
    return response({ success: true });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'No se pudo completar la operación' }, 400);
  }
});
