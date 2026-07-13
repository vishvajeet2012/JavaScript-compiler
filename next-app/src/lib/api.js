/**
 * API client for Express server (server/)
 * Base URL comes from NEXT_PUBLIC_API_URL
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';

const API_PREFIX = '/api/v1';

/**
 * Low-level fetch wrapper against the backend
 * @param {string} path - Path after /api/v1 (e.g. "/health")
 * @param {RequestInit} [options]
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${API_PREFIX}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    // Avoid Next.js aggressively caching health/landing during dev
    cache: options.cache ?? 'no-store',
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      body?.message ||
      body?.error ||
      `Request failed: ${res.status} ${res.statusText}`;
    const error = new Error(message);
    error.status = res.status;
    error.details = body;
    throw error;
  }

  return body;
}

/** GET /api/v1/health */
export async function getHealth() {
  return apiFetch('/health');
}

/** GET /api/v1/info */
export async function getInfo() {
  return apiFetch('/info');
}

/** GET /api/v1/landing — home page content */
export async function getLanding() {
  return apiFetch('/landing');
}

/**
 * POST /api/v1/contact
 * @param {{ name: string, email: string, message: string }} payload
 */
export async function submitContact(payload) {
  return apiFetch('/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** GET /api/v1/plans — public pricing */
export async function getPlans() {
  return apiFetch('/plans');
}

/**
 * POST /api/v1/purchase — buy license key (demo checkout)
 * @param {{ planId: string, name: string, email: string }} payload
 */
export async function purchaseKey(payload) {
  return apiFetch('/purchase', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** GET /api/v1/orders/:orderId */
export async function getOrder(orderId) {
  return apiFetch(`/orders/${encodeURIComponent(orderId)}`);
}

export { API_BASE, API_PREFIX };
