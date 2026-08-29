// Endpoints de administración. El motor HTTP (sesión, renovación, reintento)
// es el mismo que usa el checkout.

import { request } from '../shared/httpClient.js'

export const adminApi = {
  listOrders: ({ status, page = 1, pageSize = 20 } = {}) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (status) params.set('status', status)
    return request(`/admin/orders?${params}`)
  },

  getOrder: (id) => request(`/admin/orders/${id}`),

  /** `payload`: { status, carrier?, trackingNumber? }. Los campos vacíos no se envían. */
  updateOrderStatus: (id, { status, carrier, trackingNumber } = {}) => {
    const body = { status }
    if (carrier) body.carrier = carrier
    if (trackingNumber) body.trackingNumber = trackingNumber
    return request(`/admin/orders/${id}/status`, { method: 'PATCH', body })
  },
}
