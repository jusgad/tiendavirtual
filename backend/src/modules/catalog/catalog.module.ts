import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard, roleGuard } from '../../shared/middlewares/auth'
import { optionalAuth } from '../../shared/middlewares/optionalAuth'

import { PrismaProductRepository } from './infrastructure/prismaProductRepository'
import { PrismaCategoryRepository } from './infrastructure/prismaCategoryRepository'
import { PrismaBrandRepository } from './infrastructure/prismaBrandRepository'
import { RedisCatalogCache } from './infrastructure/redisCatalogCache'

import {
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
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

/** Composición del módulo Catálogo: cablea repos + caché → casos de uso → rutas. */
export function buildCatalogModule(prisma: PrismaClient, redis: Redis): Router {
  const productRepo = new PrismaProductRepository(prisma)
  const categoryRepo = new PrismaCategoryRepository(prisma)
  const brandRepo = new PrismaBrandRepository(prisma)
  const cache = new RedisCatalogCache(redis)

  const productController = new ProductController(
    new ListProductsUseCase(productRepo, cache),
    new GetProductUseCase(productRepo, cache),
    new CreateProductUseCase(productRepo, brandRepo, categoryRepo, cache),
    new UpdateProductUseCase(productRepo, cache),
    new DeleteProductUseCase(productRepo, cache),
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
  router.get('/products/:slug', validate({ params: slugParamSchema }), asyncHandler(productController.getBySlug))
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
