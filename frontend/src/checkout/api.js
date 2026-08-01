// Cliente HTTP mínimo contra la API real del backend PomAss. Sin dependencias
// externas (fetch nativo). Guarda tokens en localStorage para persistir la
// sesión de la demo entre recargas.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const STORAGE_KEYS = {
  access: 'pomass_access_token',
  refresh: 'pomass_refresh_token',
  user: 'pomass_user',
  guest: 'pomass_guest_id',
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user)
  return raw ? JSON.parse(raw) : null
}

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access)
}

export function storeSession({ user, tokens }) {
  localStorage.setItem(STORAGE_KEYS.access, tokens.accessToken)
  localStorage.setItem(STORAGE_KEYS.refresh, tokens.refreshToken)
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.access)
  localStorage.removeItem(STORAGE_KEYS.refresh)
  localStorage.removeItem(STORAGE_KEYS.user)
}

// El carrito/checkout de invitado se identifica con este token (lo asigna el
// backend en la primera respuesta y se reenvía en `x-guest-id`).
export function getGuestId() {
  return localStorage.getItem(STORAGE_KEYS.guest)
}

export function setGuestId(id) {
  if (id) localStorage.setItem(STORAGE_KEYS.guest, id)
}

export function clearGuestId() {
  localStorage.removeItem(STORAGE_KEYS.guest)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  if (!headers.Authorization) {
    const guestId = getGuestId()
    if (guestId) headers['x-guest-id'] = guestId
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(
      `No se pudo conectar con la API (${BASE_URL}). ¿Está el backend corriendo?`,
      0,
    )
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data?.error?.message || `Error ${res.status}`
    throw new ApiError(message, res.status, data?.error)
  }
  if (data?.guestId) setGuestId(data.guestId)
  return data
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),

  listProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/products${qs ? `?${qs}` : ''}`, { auth: false })
  },

  getCart: () => request('/cart'),
  addCartItem: (productId, quantity = 1) =>
    request('/cart/items', { method: 'POST', body: { productId, quantity } }),
  updateCartItem: (productId, quantity) =>
    request(`/cart/items/${productId}`, { method: 'PATCH', body: { quantity } }),
  removeCartItem: (productId) => request(`/cart/items/${productId}`, { method: 'DELETE' }),
  mergeCart: (guestId) => request('/cart/merge', { method: 'POST', body: { guestId } }),

  checkout: (payload) => request('/orders', { method: 'POST', body: payload }),
  getOrder: (id) => request(`/orders/${id}`),

  initiatePayment: (payload) => request('/payments', { method: 'POST', body: payload }),
}

export function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}
