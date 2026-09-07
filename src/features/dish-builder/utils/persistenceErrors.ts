type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
};

function errorDetails(error: unknown): { code: string; message: string } {
  if (!error || typeof error !== 'object') return { code: '', message: '' };
  const candidate = error as SupabaseErrorLike;
  return {
    code: typeof candidate.code === 'string' ? candidate.code : '',
    message: typeof candidate.message === 'string' ? candidate.message : '',
  };
}

function isPendingDatabaseMigration(code: string, message: string): boolean {
  return ['42703', '42P01', '42883', 'PGRST202', 'PGRST204'].includes(code) ||
    /borrador_(nombre_carta|platos)|guardar_borrador_carta/i.test(message);
}

export function menuLoadErrorMessage(error: unknown): string {
  const { code, message } = errorDetails(error);
  if (isPendingDatabaseMigration(code, message)) {
    return 'La actualización de la Carta Digital está pendiente en el servidor. Contacta con administración.';
  }
  if (code === 'PGRST116') {
    return 'Hay más de una carta asociada a tu restaurante. Contacta con administración para consolidarlas.';
  }
  if (error instanceof Error && /Contacta con soporte\.$/.test(error.message)) return error.message;
  return 'No se pudo cargar la carta. Reintenta antes de editar para evitar sobrescribir tus datos.';
}

export function menuSaveErrorMessage(error: unknown): string {
  const { code, message } = errorDetails(error);
  if (isPendingDatabaseMigration(code, message)) {
    return 'No se puede guardar porque la actualización de la Carta Digital está pendiente en el servidor.';
  }
  return 'No se ha guardado el borrador. Comprueba la conexión y pulsa Reintentar.';
}
