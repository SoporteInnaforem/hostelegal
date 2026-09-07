import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '../../../lib/supabase';

export interface Cliente {
  id: string;
  nombre_restaurante: string;
  email: string;
  fecha_caducidad_suscripcion: string;
  documentos_generados: number;
  es_admin: boolean;
}
interface AdminState { clientes: Cliente[]; isLoading: boolean; error: string | null; }
interface AdminActions {
  fetchClientes(): Promise<void>;
  crearCliente(nombre: string, email: string, password: string, fecha: string): Promise<void>;
  actualizarCliente(id: string, nombre: string, email: string, fecha: string, documentos: number, newPassword?: string): Promise<void>;
  darDeBaja(id: string): Promise<void>;
}
async function invokeAdmin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      try { const detail = await error.context.json(); message = detail.error || message; } catch { /* Preserve transport error. */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
}
export const useAdminStore = create<AdminState & AdminActions>()(devtools((set, get) => ({
  clientes: [], isLoading: false, error: null,
  fetchClientes: async () => {
    set({ isLoading: true, error: null }, false, 'admin/load');
    const { data, error } = await supabase.rpc('listar_clientes_cuota_mensual');
    set({ clientes: error ? [] : (data ?? []) as Cliente[], isLoading: false, error: error?.message ?? null }, false, 'admin/loaded');
  },
  crearCliente: async (nombre, email, password, fecha) => {
    await invokeAdmin({ action: 'create_user', userData: { email, password, nombre_restaurante: nombre, fecha_caducidad_suscripcion: fecha } });
    await get().fetchClientes();
  },
  actualizarCliente: async (id, nombre, email, fecha, documentos, newPassword) => {
    await invokeAdmin({ action: 'update_user', userId: id, userData: { email, password: newPassword, nombre_restaurante: nombre, fecha_caducidad_suscripcion: fecha, documentos_generados: documentos } });
    await get().fetchClientes();
  },
  darDeBaja: async (id) => {
    await invokeAdmin({ action: 'deactivate_user', userId: id });
    await get().fetchClientes();
  },
}), { name: 'AdminStore' }));
