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
  crearCliente: (nombre: string, email: string, password: string, fecha: string) => Promise<void>; // <-- Añadido aquí
  actualizarCliente: (id: string, nombre: string, email: string, fecha: string, documentos: number, newPassword?: string) => Promise<void>;
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
      .eq('es_admin', false) // <-- EL BLINDAJE: Solo traemos a los que NO son admin
      .order('fecha_caducidad_suscripcion', { ascending: false });
    
    if (!error && data) {
      set({ clientes: data as Cliente[], isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

crearCliente: async (nombre, email, password, fecha) => {
    const { error } = await supabase.functions.invoke('admin-users', {
      body: { 
        action: 'create_user', 
        userData: { email, password, nombre_restaurante: nombre, fecha_caducidad: fecha } // <-- Añadido aquí
      }
    });
    if (error) throw error;
    await get().fetchClientes();
  },

actualizarCliente: async (id, nombre, email, fecha, documentos, newPassword) => {
    const { error: dbError } = await supabase
      .from('empresas')
      .update({ 
          nombre_restaurante: nombre, 
          email: email, 
          fecha_caducidad_suscripcion: fecha,
          documentos_generados: documentos // <-- Guardamos el nuevo valor del contador
      })
      .eq('id', id);
    if (dbError) throw dbError;

    if (newPassword || email) {
      await supabase.functions.invoke('admin-users', {
        body: { action: 'update_user', userId: id, userData: { email, password: newPassword } }
      });
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