import { NextFunction, Request, Response, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import multer from 'multer'
import { env } from '../../shared/config/env'
import { BadRequestError } from '../../shared/errors/AppError'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard, roleGuard } from '../../shared/middlewares/auth'
import { optionalAuth } from '../../shared/middlewares/optionalAuth'

import { PrismaProductRepository } from './infrastructure/prismaProductRepository'
import { PrismaCategoryRepository } from './infrastructure/prismaCategoryRepository'
import { PrismaBrandRepository } from './infrastructure/prismaBrandRepository'
import { RedisCatalogCache } from './infrastructure/redisCatalogCache'
import { NotConfiguredImageStorage, SupabaseImageStorage } from './infrastructure/supabaseImageStorage'

import {
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
  UploadProductImageUseCase,
} from './application/productUseCases'
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
} from './application/categoryUseCases'
import {
  CreateBrandUseCase,
  DeleteBrandUseCase,
  ListBrandsUseCase,
  UpdateBrandUseCase,
} from './application/brandUseCases'

import {
  BrandController,
  CategoryController,
  ProductController,
} from './interfaces/http/catalog.controllers'
import {
  createBrandSchema,
  createCategorySchema,
  createProductSchema,
  idParamSchema,
  productListQuerySchema,
  slugParamSchema,
  updateBrandSchema,
  updateCategorySchema,
  updateProductSchema,
} from './interfaces/http/catalog.dto'

// Middleware de solo-admin reutilizado en las rutas de escritura.
const adminOnly = [authGuard, roleGuard('ADMIN')]

// Multer guarda el archivo en memoria (no en disco): de aquí sale directo
// hacia `SupabaseImageStorage`, sin un paso intermedio que limpiar. El
// límite de tamaño es la primera barrera (HTTP, 413 si se pasa); el caso de
// uso repite la comprobación por si algún día se llama sin pasar por aquí.
// El filtro de tipo es la misma idea: multer corta temprano, el caso de uso
// no confía solo en eso.
const TIPO_DE_IMAGEN_INVALIDO = 'Solo se aceptan imágenes JPG, PNG o WEBP'

const subidaDeImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const permitido = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    if (!permitido) return cb(new Error(TIPO_DE_IMAGEN_INVALIDO))
    cb(null, true)
  },
})

/**
 * Envuelve `multer` para que su error llegue como `BadRequestError`.
 *
 * Sin esto, un archivo de más de 5 MB o un tipo no permitido caería al
 * manejador central de errores como un error no reconocido y respondería
 * 500 «Error interno del servidor» — cierto para el navegador, pero no para
 * quien administra, que necesita saber que el problema es SU archivo, no la
 * tienda.
 */
function manejarSubidaDeImagen(req: Request, res: Response, next: NextFunction) {
  subidaDeImagen.single('imagen')(req, res, (err: unknown) => {
    if (!err) return next()
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new BadRequestError('La imagen no puede pesar más de 5 MB'))
    }
    if (err instanceof Error) return next(new BadRequestError(err.message))
    return next(err)
  })
}

/** Composición del módulo Catálogo: cablea repos + caché → casos de uso → rutas. */
export function buildCatalogModule(prisma: PrismaClient, redis: Redis): Router {
  const productRepo = new PrismaProductRepository(prisma)
  const categoryRepo = new PrismaCategoryRepository(prisma)
  const brandRepo = new PrismaBrandRepository(prisma)
  const cache = new RedisCatalogCache(redis)

  // Sin las dos variables, el panel sigue aceptando imágenes por URL, y el
  // botón «Subir imagen» responde con un error claro en vez de intentar
  // hablarle a una cuenta de Supabase que no existe.
  const imageStorage =
    env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? new SupabaseImageStorage({
          url: env.SUPABASE_URL,
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
          bucket: env.SUPABASE_STORAGE_BUCKET,
        })
      : new NotConfiguredImageStorage()

  const productController = new ProductController(
    new ListProductsUseCase(productRepo, cache),
    new GetProductUseCase(productRepo, cache),
    new CreateProductUseCase(productRepo, brandRepo, categoryRepo, cache),
    new UpdateProductUseCase(productRepo, cache),
    new DeleteProductUseCase(productRepo, cache),
    new UploadProductImageUseCase(imageStorage),
  )
  const categoryController = new CategoryController(
    new ListCategoriesUseCase(categoryRepo, cache),
    new CreateCategoryUseCase(categoryRepo, cache),
    new UpdateCategoryUseCase(categoryRepo, cache),
    new DeleteCategoryUseCase(categoryRepo, cache),
  )
  const brandController = new BrandController(
    new ListBrandsUseCase(brandRepo, cache),
    new CreateBrandUseCase(brandRepo, cache),
    new UpdateBrandUseCase(brandRepo, cache),
    new DeleteBrandUseCase(brandRepo, cache),
  )

  const router = Router()

  // ---- Productos ----
  router.get(
    '/products',
    optionalAuth,
    validate({ query: productListQuerySchema }),
    asyncHandler(productController.list),
  )
  router.get(
    '/products/:slug',
    optionalAuth,
    validate({ params: slugParamSchema }),
    asyncHandler(productController.getBySlug),
  )
  router.post(
    '/products',
    ...adminOnly,
    validate({ body: createProductSchema }),
    asyncHandler(productController.create),
  )
  router.patch(
    '/products/:id',
    ...adminOnly,
    validate({ params: idParamSchema, body: updateProductSchema }),
    asyncHandler(productController.update),
  )
  router.delete(
    '/products/:id',
    ...adminOnly,
    validate({ params: idParamSchema }),
    asyncHandler(productController.remove),
  )
  // Es un POST, así que no choca con el PATCH/DELETE `/products/:id` de
  // arriba aunque comparta el mismo prefijo. Sin `validate({ body })`: el
  // cuerpo es `multipart/form-data`, no JSON, así que lo procesa `multer`
  // antes de llegar al controlador.
  router.post(
    '/products/images',
    ...adminOnly,
    manejarSubidaDeImagen,
    asyncHandler(productController.uploadImage),
  )

  // ---- Categorías ----
  router.get('/categories', asyncHandler(categoryController.list))
  router.post(
    '/categories',
    ...adminOnly,
    validate({ body: createCategorySchema }),
    asyncHandler(categoryController.create),
  )
  router.patch(
    '/categories/:id',
    ...adminOnly,
    validate({ params: idParamSchema, body: updateCategorySchema }),
    asyncHandler(categoryController.update),
  )
  router.delete(
    '/categories/:id',
    ...adminOnly,
    validate({ params: idParamSchema }),
    asyncHandler(categoryController.remove),
  )

  // ---- Marcas ----
  router.get('/brands', asyncHandler(brandController.list))
  router.post(
    '/brands',
    ...adminOnly,
    validate({ body: createBrandSchema }),
    asyncHandler(brandController.create),
  )
  router.patch(
    '/brands/:id',
    ...adminOnly,
    validate({ params: idParamSchema, body: updateBrandSchema }),
    asyncHandler(brandController.update),
  )
  router.delete(
    '/brands/:id',
    ...adminOnly,
    validate({ params: idParamSchema }),
    asyncHandler(brandController.remove),
  )

  return router
}
