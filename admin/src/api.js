/** Production Express API (Vercel) when VITE_API_URL is unset */
const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  'https://java-script-server.vercel.app';

function getToken() {
  return localStorage.getItem('admin_token') || '';
}

export function setToken(token) {
  if (token) localStorage.setItem('admin_token', token);
  else localStorage.removeItem('admin_token');
}

export function hasToken() {
  return Boolean(getToken());
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (password) =>
    request('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  stats: () => request('/api/v1/admin/stats'),
  seed: (force = false) =>
    request('/api/v1/admin/seed', {
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  listOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/admin/orders${q ? `?${q}` : ''}`);
  },

  listPlans: () => request('/api/v1/admin/plans'),
  createPlan: (body) =>
    request('/api/v1/admin/plans', { method: 'POST', body: JSON.stringify(body) }),
  updatePlan: (id, body) =>
    request(`/api/v1/admin/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deletePlan: (id) => request(`/api/v1/admin/plans/${id}`, { method: 'DELETE' }),

  listKeys: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/admin/keys${q ? `?${q}` : ''}`);
  },
  generateKeys: (body) =>
    request('/api/v1/admin/keys/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  revokeKey: (id) =>
    request(`/api/v1/admin/keys/${id}/revoke`, { method: 'POST' }),
  revokeKeysBulk: (body) =>
    request('/api/v1/admin/keys/revoke-bulk', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteKey: (id) => request(`/api/v1/admin/keys/${id}`, { method: 'DELETE' }),

  crashStats: () => request('/api/v1/admin/crashes/stats'),
  listCrashes: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/admin/crashes${q ? `?${q}` : ''}`);
  },
  deleteCrash: (id) => request(`/api/v1/admin/crashes/${id}`, { method: 'DELETE' }),

  usageOverview: () => request('/api/v1/admin/usage/overview'),
  usageDevices: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/admin/usage/devices${q ? `?${q}` : ''}`);
  },
  usageDevice: (machineId) =>
    request(`/api/v1/admin/usage/devices/${encodeURIComponent(machineId)}`),
  setDeviceProtection: (machineId, body) =>
    request(`/api/v1/admin/usage/devices/${encodeURIComponent(machineId)}/protection`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
