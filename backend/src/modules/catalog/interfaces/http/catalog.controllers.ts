import { Request, Response } from 'express'
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
} from '../../application/productUseCases'
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
} from '../../application/categoryUseCases'
import {
  CreateBrandUseCase,
  DeleteBrandUseCase,
  ListBrandsUseCase,
  UpdateBrandUseCase,
} from '../../application/brandUseCases'
import { ProductFilter } from '../../domain/ports'

export class ProductController {
  constructor(
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    const q = req.query as unknown as Record<string, string | number | undefined>
    const filter: ProductFilter = {
      search: q.search as string | undefined,
      categorySlug: q.category as string | undefined,
      brandSlug: q.brand as string | undefined,
      minPrice: q.minPrice as number | undefined,
      maxPrice: q.maxPrice as number | undefined,
      usageType: q.usageType as string | undefined,
      skinType: q.skinType as string | undefined,
      sort: q.sort as ProductFilter['sort'],
      // El listado es público: un visitante nunca debe ver productos
      // desactivados, aunque mande `includeInactive`. Solo el panel, que va
      // autenticado como ADMIN, puede pedirlos.
      activeOnly: !(q.includeInactive && req.user?.role === 'ADMIN'),
      page: q.page as number,
      pageSize: q.pageSize as number,
    }
    res.json(await this.listProducts.execute(filter))
  }

  getBySlug = async (req: Request, res: Response) => {
    const includeInactive = req.user?.role === 'ADMIN'
    res.json({ product: await this.getProduct.execute(req.params.slug, { includeInactive }) })
  }

  create = async (req: Request, res: Response) => {
    res.status(201).json({ product: await this.createProduct.execute(req.body) })
  }

  update = async (req: Request, res: Response) => {
    res.json({ product: await this.updateProduct.execute(req.params.id, req.body) })
  }

  remove = async (req: Request, res: Response) => {
    await this.deleteProduct.execute(req.params.id)
    res.status(204).send()
  }
}

export class CategoryController {
  constructor(
    private readonly listCategories: ListCategoriesUseCase,
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true'
    res.json({ categories: await this.listCategories.execute(!includeInactive) })
  }

  create = async (req: Request, res: Response) => {
    res.status(201).json({ category: await this.createCategory.execute(req.body) })
  }

  update = async (req: Request, res: Response) => {
    res.json({ category: await this.updateCategory.execute(req.params.id, req.body) })
  }

  remove = async (req: Request, res: Response) => {
    await this.deleteCategory.execute(req.params.id)
    res.status(204).send()
  }
}

export class BrandController {
  constructor(
    private readonly listBrands: ListBrandsUseCase,
    private readonly createBrand: CreateBrandUseCase,
    private readonly updateBrand: UpdateBrandUseCase,
    private readonly deleteBrand: DeleteBrandUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true'
    res.json({ brands: await this.listBrands.execute(!includeInactive) })
  }

  create = async (req: Request, res: Response) => {
    res.status(201).json({ brand: await this.createBrand.execute(req.body) })
  }

  update = async (req: Request, res: Response) => {
    res.json({ brand: await this.updateBrand.execute(req.params.id, req.body) })
  }

  remove = async (req: Request, res: Response) => {
    await this.deleteBrand.execute(req.params.id)
    res.status(204).send()
  }
}
