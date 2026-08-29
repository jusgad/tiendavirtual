// Endpoints que consume el checkout. El motor HTTP (sesión, renovación de
// token, reintento) vive en `shared/httpClient.js` y lo comparte con el panel.

import { request } from '../shared/httpClient.js'

export {
  ApiError,
  clearGuestId,
  clearSession,
  getAccessToken,
  getGuestId,
  getRefreshToken,
  getStoredUser,
  setGuestId,
  setOnSessionExpired,
  storeSession,
  storeTokens,
} from '../shared/httpClient.js'

export { formatCOP } from '../shared/format.js'

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

  // Seguimiento público: sin sesión, con nº de pedido + correo.
  trackOrder: ({ orderNumber, email }) =>
    request(`/orders/track?${new URLSearchParams({ orderNumber, email })}`, { auth: false }),

  initiatePayment: (payload) => request('/payments', { method: 'POST', body: payload }),
}
