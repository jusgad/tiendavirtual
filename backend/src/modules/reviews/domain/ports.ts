export interface Review {
  id: string
  productId: string
  userId: string
  orderId: string | null
  rating: number
  title: string | null
  comment: string | null
  isAnonymous: boolean
  isApproved: boolean
  createdAt: Date
  /** Nombre a mostrar; null si es anónima o el usuario ya no existe. */
  authorName: string | null
}

export interface CreateReviewData {
  productId: string
  userId: string
  orderId: string | null
  rating: number
  title?: string | null
  comment?: string | null
  isAnonymous?: boolean
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// -------- Puertos --------

export interface ReviewRepository {
  /** Reseñas aprobadas de un producto, más recientes primero. */
  listApprovedByProduct(productId: string, page: number, pageSize: number): Promise<Paginated<Review>>
  findByUserAndProduct(userId: string, productId: string): Promise<Review | null>
  create(data: CreateReviewData): Promise<Review>
}

/** Verifica si un usuario recibió (DELIVERED) un pedido que incluye el producto. */
export interface PurchaseVerificationGateway {
  findDeliveredOrderId(userId: string, productId: string): Promise<string | null>
}
