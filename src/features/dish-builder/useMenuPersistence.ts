import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useMenuStore } from './store/useMenuStore';
import { parseStoredMenu } from './utils/menuValidation';

// Serialize writes, including writes from a previous mount, so an older save
// cannot finish after a newer save and overwrite it.
let writes: Promise<void> = Promise.resolve();

export function useMenuPersistence() {
  const ownerId = useMenuStore((s) => s.ownerId);
  const hydrated = useMenuStore((s) => s.hydrated);
  const revision = useMenuStore((s) => s.revision);
  const savedRevision = useMenuStore((s) => s.savedRevision);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ownerId || hydrated) return;
    let active = true;
    async function load() {
      try {
        const { data, error: loadError } = await supabase.from('cartas')
          .select('nombre_carta,platos,borrador_nombre_carta,borrador_platos').eq('empresa_id', ownerId).maybeSingle();
        if (loadError) throw loadError;
        let name = data?.borrador_nombre_carta ?? data?.nombre_carta ?? '';
        if (!data) {
          const { data: company, error: companyError } = await supabase.from('empresas').select('nombre_restaurante').eq('id', ownerId).single();
          if (companyError) throw companyError;
          name = company?.nombre_restaurante ?? '';
        }
        const menu = parseStoredMenu(data?.borrador_platos ?? data?.platos ?? []);
        if (active && ownerId) {
          useMenuStore.getState().hydrate(ownerId, menu, name);
          setError(null);
        }
      } catch {
        if (active) setError('No se pudo cargar la carta. Reintenta antes de editar para evitar sobrescribir tus datos.');
      }
    }
    void load();
    return () => { active = false; };
  }, [ownerId, hydrated, attempt]);

  const saveNow = useCallback(async () => {
    const snapshot = useMenuStore.getState();
    if (!snapshot.ownerId || !snapshot.hydrated || snapshot.revision === snapshot.savedRevision) return;
    const expectedOwner = snapshot.ownerId;
    setSaving(true);
    const operation = writes.catch(() => {}).then(async () => {
      if (useMenuStore.getState().ownerId !== expectedOwner) return;
      const { error: saveError } = await supabase.rpc('guardar_borrador_carta', {
        p_empresa_id: expectedOwner, p_nombre: snapshot.restaurantName.trim(), p_platos: snapshot.menu,
      });
      if (saveError) throw saveError;
      useMenuStore.getState().markSaved(expectedOwner, snapshot.revision);
    });
    writes = operation;
    try {
      await operation;
      if (useMenuStore.getState().ownerId === expectedOwner) setError(null);
    } catch {
      if (useMenuStore.getState().ownerId === expectedOwner) setError('No se ha guardado el borrador. Comprueba la conexión y pulsa Reintentar.');
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || revision === savedRevision) return;
    const timeout = setTimeout(() => { void saveNow(); }, 600);
    return () => clearTimeout(timeout);
  }, [hydrated, revision, savedRevision, saveNow]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const state = useMenuStore.getState();
      if (state.revision !== state.savedRevision || state.draftDish.name || state.draftDish.ingredients.length) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); void saveNow(); };
  }, [saveNow]);

  return { hydrated, error, saving, dirty: revision !== savedRevision, saveNow,
    retry: () => { if (hydrated) void saveNow(); else setAttempt((value) => value + 1); } };
}
