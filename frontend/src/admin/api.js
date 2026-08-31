// Endpoints de administración. El motor HTTP (sesión, renovación, reintento)
// es el mismo que usa el checkout.

import { request } from '../shared/httpClient.js'
import { limitesConsulta } from './reports/reportsModel.js'

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

  // ---- Catálogo ----
  // El panel siempre pide los inactivos: si no, un producto desactivado
  // desaparecería de la lista y no habría forma de reactivarlo.
  listProducts: ({ page = 1, pageSize = 50 } = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      includeInactive: 'true',
    })
    return request(`/products?${params}`)
  },
  createProduct: (datos) => request('/products', { method: 'POST', body: datos }),
  updateProduct: (id, datos) => request(`/products/${id}`, { method: 'PATCH', body: datos }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  listCategories: () => request('/categories?includeInactive=true'),
  createCategory: (datos) => request('/categories', { method: 'POST', body: datos }),
  updateCategory: (id, datos) => request(`/categories/${id}`, { method: 'PATCH', body: datos }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  listBrands: () => request('/brands?includeInactive=true'),
  createBrand: (datos) => request('/brands', { method: 'POST', body: datos }),
  updateBrand: (id, datos) => request(`/brands/${id}`, { method: 'PATCH', body: datos }),
  deleteBrand: (id) => request(`/brands/${id}`, { method: 'DELETE' }),

  // ---- Cupones ----
  listCoupons: () => request('/coupons?includeInactive=true'),
  createCoupon: (datos) => request('/coupons', { method: 'POST', body: datos }),
  updateCoupon: (id, datos) => request(`/coupons/${id}`, { method: 'PATCH', body: datos }),

  // ---- Reportes ----
  // Las fechas del formulario van como instantes de Colombia (ver
  // `limitesConsulta`): así el último día entra completo. La fecha que la
  // dueña deje en blanco no se manda y el backend aplica su propio rango.
  salesReport: ({ from, to, groupBy = 'day' } = {}) => {
    const params = new URLSearchParams({ groupBy, ...limitesConsulta({ from, to }) })
    return request(`/admin/reports/sales?${params}`)
  },
  topProducts: (limit = 5) => request(`/admin/reports/top-products?limit=${limit}`),
  ordersByStatus: () => request('/admin/reports/orders-by-status'),
}
