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

  // Relative /api — same origin; Vite (dev) or reverse proxy forwards /socket.io
  return window.location.origin;
}
