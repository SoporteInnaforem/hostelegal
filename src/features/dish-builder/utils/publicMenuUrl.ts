const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const STABLE_VERCEL_HOSTS = new Set([
  'portal-hostelegal.vercel.app',
  'cartas-portal-hostelegal.vercel.app',
  'cartahostelegal.vercel.app',
]);

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

/**
 * Keeps QR links inside the active local/Preview deployment so the public
 * route uses the exact same frontend version that generated the QR.
 */
export function publicMenuOrigin(currentOrigin: string, configuredOrigin?: string): string {
  const current = new URL(currentOrigin);
  const isVercelPreview = current.hostname.endsWith('.vercel.app') && !STABLE_VERCEL_HOSTS.has(current.hostname);

  if (LOCAL_HOSTS.has(current.hostname) || isVercelPreview) return current.origin;

  const configured = configuredOrigin?.trim();
  if (configured) return withoutTrailingSlash(configured);

  if (current.hostname === 'portal-hostelegal.vercel.app') {
    return 'https://cartas-portal-hostelegal.vercel.app';
  }

  return current.origin;
}

export function publicMenuUrl(currentOrigin: string, menuId: string, configuredOrigin?: string): string {
  return `${publicMenuOrigin(currentOrigin, configuredOrigin)}/carta/${encodeURIComponent(menuId)}`;
}
