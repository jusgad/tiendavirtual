// Documento OpenAPI base. Cada módulo agrega sus rutas al objeto `paths`
// mediante registerPaths(), manteniendo la doc modular por dominio.

export const openApiDocument: {
  openapi: string
  info: object
  servers: object[]
  tags: { name: string; description?: string }[]
  components: object
  paths: Record<string, unknown>
} = {
  openapi: '3.0.3',
  info: {
    title: 'PomAss API',
    version: '0.1.0',
    description:
      'API de la tienda virtual PomAss (cremas y productos de cuidado íntimo). ' +
      'Autenticación con JWT (Bearer). Todos los montos están en COP.',
  },
  servers: [{ url: '/api', description: 'Servidor principal' }],
  tags: [
    { name: 'Auth', description: 'Registro, login y tokens' },
    { name: 'Catálogo', description: 'Productos, categorías y marcas' },
    { name: 'Carrito', description: 'Carrito de compras' },
    { name: 'Pedidos', description: 'Checkout y pedidos' },
    { name: 'Pagos', description: 'Pagos y webhooks' },
    { name: 'Reseñas', description: 'Calificaciones y comentarios' },
    { name: 'Cupones', description: 'Cupones y descuentos' },
    { name: 'Admin', description: 'Endpoints de administración' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
  },
  paths: {},
}

/** Combina fragmentos de rutas de cada módulo en el documento global. */
export function registerPaths(paths: Record<string, unknown>): void {
  Object.assign(openApiDocument.paths, paths)
}

/** Registra schemas reutilizables de un módulo. */
export function registerSchemas(schemas: Record<string, unknown>): void {
  Object.assign((openApiDocument.components as { schemas: Record<string, unknown> }).schemas, schemas)
}
