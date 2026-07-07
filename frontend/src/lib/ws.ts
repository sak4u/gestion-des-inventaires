/** Base URL for Socket.io (NestJS on :3000). Not the same as VITE_API_URL (/api proxy). */
export function getWebSocketBaseUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }

  // In development, connect directly to the NestJS backend (or production if configured)
  if (import.meta.env.DEV) {
    return 'https://gestion-des-inventaires-backend.vercel.app/';
  }

  return window.location.origin;
}
