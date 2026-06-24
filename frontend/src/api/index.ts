import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://gestion-des-inventaires-backend.vercel.app/';

export const apiClient = axios.create({ baseURL: API_BASE });

// ── Inject Bearer token on every request ──────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Global 401 handler → redirect to login ────────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════════════════
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; roleId: string }) =>
    apiClient.post('/auth/register', data),
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (email: string, code: string, password: string) =>
    apiClient.post('/auth/reset-password', { email, code, newPassword: password }),
  roles: () => apiClient.get('/auth/roles'),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export const dashboardApi = {
  kpis: () => apiClient.get('/dashboard/kpis'),
  recentFlux: () => apiClient.get('/flux-de-stocks', { params: { limit: '5' } }),
  recentPropositions: () =>
    apiClient.get('/propositions', { params: { statut: 'EN_ATTENTE', limit: '5' } }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUITS
// ═══════════════════════════════════════════════════════════════════════════════
export const produitsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get('/produits', { params }),
  get: (id: string) => apiClient.get(`/produits/${id}`),
  lookupByCodeBare: (codeBare: string) =>
    apiClient.get('/produits/by-code-barre/lookup', { params: { codeBare } }),
  qrCodeByCodeBare: (codeBare: string) =>
    apiClient.get('/produits/by-code-barre/qrcode', { params: { codeBare } }),
  create: (data: unknown) => apiClient.post('/produits', data),
  update: (id: string, data: unknown) => apiClient.patch(`/produits/${id}`, data),
  delete: (id: string) => apiClient.delete(`/produits/${id}`),
  stock: (id: string) => apiClient.get('/stock-entrepot', { params: { produitId: id } }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ENTREPÔTS
// ═══════════════════════════════════════════════════════════════════════════════
export const entrepotsApi = {
  list: () => apiClient.get('/entrepots'),
  get: (id: string) => apiClient.get(`/entrepots/${id}`),
  create: (data: unknown) => apiClient.post('/entrepots', data),
  update: (id: string, data: unknown) => apiClient.patch(`/entrepots/${id}`, data),
  delete: (id: string) => apiClient.delete(`/entrepots/${id}`),
  stock: (id: string) => apiClient.get('/stock-entrepot', { params: { entrepotId: id } }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FOURNISSEURS
// ═══════════════════════════════════════════════════════════════════════════════
export const fournisseursApi = {
  list: () => apiClient.get('/fournisseurs'),
  get: (id: string) => apiClient.get(`/fournisseurs/${id}`),
  create: (data: unknown) => apiClient.post('/fournisseurs', data),
  update: (id: string, data: unknown) => apiClient.patch(`/fournisseurs/${id}`, data),
  delete: (id: string) => apiClient.delete(`/fournisseurs/${id}`),
  produits: (id: string) =>
    apiClient.get('/fournisseur-produits', { params: { fournisseurId: id } }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FOURNISSEUR-PRODUIT (catalogue prix)
// ═══════════════════════════════════════════════════════════════════════════════
export const fournisseurProduitApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get('/fournisseur-produits', { params }),
  create: (data: unknown) => apiClient.post('/fournisseur-produits', data),
  update: (id: string, data: unknown) =>
    apiClient.patch(`/fournisseur-produits/${id}`, data),
  delete: (id: string) => apiClient.delete(`/fournisseur-produits/${id}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  COMMANDES
// ═══════════════════════════════════════════════════════════════════════════════
export const commandesApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get('/commandes', { params }),
  get: (id: string) => apiClient.get(`/commandes/${id}`),
  enums: () => apiClient.get('/commandes/enums'),
  create: (data: unknown) => apiClient.post('/commandes', data),
  update: (id: string, data: unknown) => apiClient.patch(`/commandes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/commandes/${id}`),
  accept: (id: string, entrepotId: string) =>
    apiClient.post(`/commandes/${id}/accept`, { entrepotId }),
  stats: () => apiClient.get('/commandes/stats'),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  COMMANDE LIGNES
// ═══════════════════════════════════════════════════════════════════════════════
export const commandeLignesApi = {
  byCommande: (commandeId: string) =>
    apiClient.get('/commande-lignes', { params: { commandeId } }),
  create: (data: unknown) => apiClient.post('/commande-lignes', data),
  delete: (id: string) => apiClient.delete(`/commande-lignes/${id}`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FLUX DE STOCK
// ═══════════════════════════════════════════════════════════════════════════════
export const fluxDeStockApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get('/flux-de-stocks', { params }),
  get: (id: string) => apiClient.get(`/flux-de-stocks/${id}`),
  create: (data: unknown) => apiClient.post('/flux-de-stocks', data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PROPOSITIONS IA
// ═══════════════════════════════════════════════════════════════════════════════
export const propositionsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get('/propositions', { params }),
  get: (id: string) => apiClient.get(`/propositions/${id}`),
  enums: () => apiClient.get('/propositions/enums'),
  accept: (id: string, entrepotId: string) =>
    apiClient.post(`/propositions/${id}/accept`, { entrepotId }),
  refuse: (id: string) =>
    apiClient.post(`/propositions/${id}/reject`),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STOCK ENTREPÔT
// ═══════════════════════════════════════════════════════════════════════════════
export const stockEntrepotApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get('/stock-entrepot', { params }),
  exportCsv: (params?: Record<string, string>) =>
    apiClient.get('/stock-entrepot/export/csv', { params, responseType: 'blob' }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  USERS (Admin)
// ═══════════════════════════════════════════════════════════════════════════════
export const usersApi = {
  /** Lister tous les utilisateurs */
  list: () => apiClient.get('/auth/users'),

  /** Créer un utilisateur (admin) avec rôle imposé */
  create: (data: { name: string; email: string; password: string; roleName: string }) =>
    apiClient.post('/auth/users', data),

  /** Modifier nom, email et/ou rôle */
  update: (id: string, data: { name?: string; email?: string; roleName?: string }) =>
    apiClient.patch(`/auth/users/${id}`, data),

  /** Basculer actif / désactivé */
  toggleActive: (id: string) =>
    apiClient.patch(`/auth/users/${id}/toggle-active`),

  /** Suppression définitive */
  delete: (id: string) => apiClient.delete(`/auth/users/${id}`),
};

