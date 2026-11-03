import 'dotenv/config'
import { PrismaClient, CouponType, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const INSECURE_ADMIN_PASSWORD = 'Admin123*'

// Base de las URLs de imagen de producto. En producción apunta al bucket
// público de Supabase Storage; en local, a los assets que sirve el frontend.
const IMAGE_BASE = (process.env.PRODUCT_IMAGE_BASE_URL ?? 'http://localhost:5173/images').replace(/\/$/, '')

// Inventario inicial del estuche. Ajústalo al stock real antes de lanzar.
const INITIAL_STOCK = Number(process.env.INITIAL_STOCK ?? 100)

// Productos de ejemplo del catálogo genérico anterior. Ya no se siembran; si
// existen de una ejecución previa se desactivan (no se borran: podrían estar
// referenciados por pedidos históricos).
const LEGACY_PRODUCT_SLUGS = [
  'pomass-dia-crema-intima',
  'pomass-noche-crema-blanqueadora',
  'lubricante-intimo-base-agua',
  'gel-refrescante-intimo',
  'balsamo-post-depilacion',
  'jabon-intimo-femenino-ph',
  'gel-higiene-intima-masculina',
]

async function main() {
  // ----- Admin -----
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@pomass.co').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD ?? INSECURE_ADMIN_PASSWORD

  // Nunca sembrar un admin con la contraseña por defecto en producción.
  if (process.env.NODE_ENV === 'production' && adminPassword === INSECURE_ADMIN_PASSWORD) {
    throw new Error(
      'Define ADMIN_PASSWORD con un valor propio antes de sembrar en producción (la contraseña por defecto es una credencial conocida).',
    )
  }

  const passwordHash = await bcrypt.hash(adminPassword, Number(process.env.BCRYPT_SALT_ROUNDS ?? 12))

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Admin',
      lastName: 'PomAss',
      role: Role.ADMIN,
      ageConfirmed: true,
    },
  })

  // ----- Marca -----
  const brand = await prisma.brand.upsert({
    where: { slug: 'pomass' },
    update: {},
    create: {
      name: 'PomAss',
      slug: 'pomass',
      description: 'Marca colombiana de cuidado íntimo · Pao Díaz',
    },
  })

  // ----- Categoría -----
  // Una sola categoría: el modelo soporta un árbol completo, pero sembrar
  // categorías que hoy no tienen productos solo ensucia el catálogo.
  const category = await prisma.category.upsert({
    where: { slug: 'cuidado-intimo' },
    update: {},
    create: {
      name: 'Cuidado íntimo',
      slug: 'cuidado-intimo',
      description: 'Cremas y productos de cuidado e higiene íntima',
    },
  })

  // ----- Producto real: el estuche que se vende hoy -----
  const product = await prisma.product.upsert({
    where: { slug: 'estuche-pomass-dia-noche' },
    // El precio NO se toca al re-sembrar: lo lleva el panel admin, y el
    // stack de Docker re-siembra en cada arranque, así que lo pisaría. El
    // stock sí se refresca; el resto del copy tampoco se pisa.
    update: { stock: INITIAL_STOCK, isActive: true },
    create: {
      name: 'Estuche PomAss Día + Noche',
      slug: 'estuche-pomass-dia-noche',
      sku: 'PA-ESTUCHE-DIANOCHE',
      description:
        'El combo completo de cuidado íntimo PomAss. DÍA: crema íntima de uso diario que ' +
        'neutraliza olores indeseados, ideal para el gimnasio y para tu rutina diaria, con ' +
        'mayor confianza en momentos íntimos. NOCHE: crema íntima blanqueadora que ayuda a ' +
        'aclarar la zona íntima y anal, de uso nocturno para mejores resultados, con una ' +
        'fórmula suave y segura para ti.',
      brandId: brand.id,
      categoryId: category.id,
      price: 94000,
      currency: 'COP',
      presentation: 'Estuche Día + Noche · 2 tubos de 50 ml',
      sizeMl: 100,
      usageType: 'cuidado íntimo',
      skinType: 'sensible',
      ingredients:
        'DÍA: aloe vera, ácido láctico, glicerina vegetal, pantenol. ' +
        'NOCHE: niacinamida, alfa-arbutina, vitamina C, manteca de karité.',
      warnings:
        'Solo uso externo. Suspender si hay irritación. Evitar exposición solar directa tras ' +
        'aplicar la crema de noche. Mantener fuera del alcance de menores.',
      stock: INITIAL_STOCK,
    },
  })

  // ----- Imágenes del producto -----
  // `position` es la clave estable para re-sembrar sin duplicar (ProductImage
  // no tiene restricción de unicidad propia).
  // PNG con fondo transparente, a 400-480px de ancho (~250-345 KB). El ancho
  // sale de dónde se muestran: 150px en la landing y ~300px en la tarjeta del
  // checkout, así que ese rango deja margen para pantallas retina sin cargar
  // de más. Los originales rondaban los 5 MB, inviables como miniatura en
  // datos móviles, que es como se compra esto.
  //
  // La posición 0 es la que se ve en la tarjeta del catálogo (checkout) y en
  // el listado del admin — un solo tubo ahí no representaba el estuche que
  // de verdad se vende, así que es el combo de los dos. Las posiciones 1 y 2
  // quedan como fotos individuales, por si algún día hay una galería.
  const images = [
    { position: 0, url: `${IMAGE_BASE}/estuche_combo.png`, alt: 'Estuche PomAss · Día + Noche' },
    { position: 1, url: `${IMAGE_BASE}/tubo_dia.png`, alt: 'Estuche PomAss · crema Día' },
    { position: 2, url: `${IMAGE_BASE}/tubo_noche.png`, alt: 'Estuche PomAss · crema Noche' },
  ]
  for (const img of images) {
    const existing = await prisma.productImage.findFirst({
      where: { productId: product.id, position: img.position },
      select: { id: true },
    })
    if (existing) {
      await prisma.productImage.update({ where: { id: existing.id }, data: img })
    } else {
      await prisma.productImage.create({ data: { ...img, productId: product.id } })
    }
  }

  // ----- Hueco para un producto nuevo -----
  // Desactivado: no sale en la tienda ni se puede comprar, solo aparece en el
  // panel admin. No es un producto inventado: no tiene nombre comercial, ni
  // precio (0, y el panel no deja activarlo así), ni stock. Se rellena desde
  // el panel y se activa cuando exista de verdad. `update: {}` para que
  // re-sembrar no deshaga lo que se haya escrito ahí.
  await prisma.product.upsert({
    where: { slug: 'producto-nuevo' },
    update: {},
    create: {
      name: 'Producto nuevo (borrador)',
      slug: 'producto-nuevo',
      sku: 'PA-NUEVO-1',
      description:
        'Hueco para un producto nuevo. Rellena nombre, descripción, precio, stock e imágenes ' +
        'desde el panel y actívalo cuando esté listo para venderse.',
      brandId: brand.id,
      categoryId: category.id,
      price: 0,
      currency: 'COP',
      stock: 0,
      isActive: false,
    },
  })

  // ----- Desactiva el catálogo genérico anterior -----
  const { count: desactivados } = await prisma.product.updateMany({
    where: { slug: { in: LEGACY_PRODUCT_SLUGS }, isActive: true },
    data: { isActive: false },
  })

  // ----- Cupón de bienvenida -----
  // OJO: `perUserLimit` solo se puede hacer valer con usuarios registrados; en
  // una tienda de invitados no hay identidad que contar. `maxUses` sí es un
  // tope real, así que la promoción se acota globalmente.
  await prisma.coupon.upsert({
    where: { code: 'BIENVENIDA10' },
    update: {},
    create: {
      code: 'BIENVENIDA10',
      type: CouponType.PERCENTAGE,
      value: 10,
      minPurchase: 50000,
      maxUses: 100,
      perUserLimit: 1,
      isActive: true,
    },
  })

  // eslint-disable-next-line no-console
  console.log(
    `✅ Seed completado: admin, marca PomAss, categoría "Cuidado íntimo", ` +
      `1 producto (stock ${INITIAL_STOCK}), 1 borrador oculto, 2 imágenes y cupón BIENVENIDA10.` +
      (desactivados > 0 ? ` Se desactivaron ${desactivados} productos de ejemplo antiguos.` : ''),
  )
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('❌ Error en el seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
