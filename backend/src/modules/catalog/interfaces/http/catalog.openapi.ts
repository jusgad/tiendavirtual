import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

registerSchemas({
  Product: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      sku: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'number' },
      currency: { type: 'string', example: 'COP' },
      presentation: { type: 'string', nullable: true },
      sizeMl: { type: 'integer', nullable: true },
      usageType: { type: 'string', nullable: true },
      skinType: { type: 'string', nullable: true },
      ingredients: { type: 'string', nullable: true },
      warnings: { type: 'string', nullable: true },
      stock: { type: 'integer' },
      isActive: { type: 'boolean' },
      brand: { type: 'object', nullable: true },
      category: { type: 'object', nullable: true },
      images: { type: 'array', items: { type: 'object' } },
    },
  },
  Category: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string', nullable: true },
      parentId: { type: 'string', nullable: true },
      isActive: { type: 'boolean' },
    },
  },
  Brand: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string', nullable: true },
      logoUrl: { type: 'string', nullable: true },
      isActive: { type: 'boolean' },
    },
  },
})

const admin = [{ bearerAuth: [] }]

registerPaths({
  '/products': {
    get: {
      tags: ['Catálogo'],
      summary: 'Listar productos con búsqueda, filtros y paginación',
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' }, description: 'slug de categoría' },
        { name: 'brand', in: 'query', schema: { type: 'string' }, description: 'slug de marca' },
        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        { name: 'usageType', in: 'query', schema: { type: 'string' } },
        { name: 'skinType', in: 'query', schema: { type: 'string' } },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['price_asc', 'price_desc', 'newest'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: {
          description: 'Página de productos',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Catálogo'],
      summary: 'Crear producto (admin)',
      security: admin,
      responses: { 201: { description: 'Creado' }, 401: { description: 'No autenticado' }, 403: { description: 'Requiere admin' } },
    },
  },
  '/products/{slug}': {
    get: {
      tags: ['Catálogo'],
      summary: 'Obtener un producto por slug',
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Producto',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { product: { $ref: '#/components/schemas/Product' } } },
            },
          },
        },
        404: { description: 'No encontrado' },
      },
    },
  },
  '/products/{id}': {
    patch: {
      tags: ['Catálogo'],
      summary: 'Actualizar producto (admin)',
      security: admin,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Actualizado' }, 404: { description: 'No encontrado' } },
    },
    delete: {
      tags: ['Catálogo'],
      summary: 'Eliminar producto (admin)',
      security: admin,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 204: { description: 'Eliminado' }, 404: { description: 'No encontrado' } },
    },
  },
  '/categories': {
    get: {
      tags: ['Catálogo'],
      summary: 'Listar categorías',
      responses: { 200: { description: 'Lista de categorías' } },
    },
    post: { tags: ['Catálogo'], summary: 'Crear categoría (admin)', security: admin, responses: { 201: { description: 'Creada' } } },
  },
  '/categories/{id}': {
    patch: { tags: ['Catálogo'], summary: 'Actualizar categoría (admin)', security: admin, responses: { 200: { description: 'Actualizada' } } },
    delete: { tags: ['Catálogo'], summary: 'Eliminar categoría (admin)', security: admin, responses: { 204: { description: 'Eliminada' }, 409: { description: 'Tiene productos asociados' } } },
  },
  '/brands': {
    get: { tags: ['Catálogo'], summary: 'Listar marcas', responses: { 200: { description: 'Lista de marcas' } } },
    post: { tags: ['Catálogo'], summary: 'Crear marca (admin)', security: admin, responses: { 201: { description: 'Creada' } } },
  },
  '/brands/{id}': {
    patch: { tags: ['Catálogo'], summary: 'Actualizar marca (admin)', security: admin, responses: { 200: { description: 'Actualizada' } } },
    delete: { tags: ['Catálogo'], summary: 'Eliminar marca (admin)', security: admin, responses: { 204: { description: 'Eliminada' }, 409: { description: 'Tiene productos asociados' } } },
  },
})
