import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';

export interface Cliente {
  id: string;
  nombre_restaurante: string;
  email: string;
  fecha_caducidad_suscripcion: string;
  es_admin: boolean;
}

interface AdminState {
  clientes: Cliente[];
  isLoading: boolean;
  fetchClientes: () => Promise<void>;
  crearCliente: (nombre: string, email: string, password: string) => Promise<void>;
  actualizarCliente: (id: string, nombre: string, email: string, fecha: string, newPassword?: string) => Promise<void>;
  darDeBaja: (id: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  clientes: [],
  isLoading: false,

  fetchClientes: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('fecha_caducidad_suscripcion', { ascending: false });
    
    if (!error && data) {
      set({ clientes: data as Cliente[], isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  crearCliente: async (nombre, email, password) => {
    // 1. Llama a la Edge Function para crear el Auth (esto dispara el trigger SQL)
    const { error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'create_user', userData: { email, password, nombre_restaurante: nombre } }
    });
    if (error) throw error;
    // Recargar la tabla
    await get().fetchClientes();
  },

  actualizarCliente: async (id, nombre, email, fecha, newPassword) => {
    // 1. Actualizar datos en la tabla empresas (Frontend directo por RLS)
    const { error: dbError } = await supabase
      .from('empresas')
      .update({ nombre_restaurante: nombre, email: email, fecha_caducidad_suscripcion: fecha })
      .eq('id', id);
    if (dbError) throw dbError;

    // 2. Si se cambió la contraseña o el email, avisamos a la Edge Function
    if (newPassword || email) {
      const { error: fnError } = await supabase.functions.invoke('admin-users', {
        body: { action: 'update_user', userId: id, userData: { email, password: newPassword } }
      });
      if (fnError) throw fnError;
    }
    
    await get().fetchClientes();
  },

  darDeBaja: async (id) => {
    // Soft Delete: Ponemos la fecha en el año 2000
    const { error } = await supabase
      .from('empresas')
      .update({ fecha_caducidad_suscripcion: '2000-01-01T00:00:00Z' })
      .eq('id', id);
    if (error) throw error;
    await get().fetchClientes();
  }
}));