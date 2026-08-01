import 'dotenv/config'
import { PrismaClient, CouponType, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const INSECURE_ADMIN_PASSWORD = 'Admin123*'

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

  // ----- Marcas -----
  const brands = [
    { name: 'PomAss', slug: 'pomass', description: 'Marca colombiana de cuidado íntimo · Pao Díaz' },
    { name: 'IntimCare', slug: 'intimcare', description: 'Cuidado íntimo dermatológico' },
    { name: 'PureSkin', slug: 'pureskin', description: 'Higiene y frescura diaria' },
  ]
  for (const b of brands) {
    await prisma.brand.upsert({ where: { slug: b.slug }, update: {}, create: b })
  }

  // ----- Categorías -----
  const categories = [
    { name: 'Lubricantes', slug: 'lubricantes', description: 'Lubricantes íntimos' },
    { name: 'Cremas hidratantes íntimas', slug: 'cremas-hidratantes-intimas', description: 'Hidratación de la zona íntima' },
    { name: 'Geles', slug: 'geles', description: 'Geles refrescantes y de limpieza' },
    { name: 'Cuidado post-depilación', slug: 'cuidado-post-depilacion', description: 'Calma e hidrata tras depilar' },
    { name: 'Higiene femenina', slug: 'higiene-femenina', description: 'Higiene íntima femenina' },
    { name: 'Higiene masculina', slug: 'higiene-masculina', description: 'Higiene íntima masculina' },
  ]
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c })
  }

  const brandBy = async (slug: string) =>
    (await prisma.brand.findUniqueOrThrow({ where: { slug } })).id
  const catBy = async (slug: string) =>
    (await prisma.category.findUniqueOrThrow({ where: { slug } })).id

  // ----- Productos -----
  const products = [
    {
      name: 'PomAss Día · Crema íntima',
      slug: 'pomass-dia-crema-intima',
      sku: 'PA-DIA-50',
      description: 'Crema íntima de uso diario. Neutraliza olores y aporta frescura.',
      brand: 'pomass',
      category: 'cremas-hidratantes-intimas',
      price: 45900,
      presentation: 'Tubo 50 ml',
      sizeMl: 50,
      usageType: 'hidratante',
      skinType: 'sensible',
      ingredients: 'Aloe vera, ácido láctico, glicerina vegetal, pantenol.',
      warnings: 'Solo uso externo. Suspender si hay irritación. Mantener fuera del alcance de menores.',
      stock: 120,
    },
    {
      name: 'PomAss Noche · Crema íntima blanqueadora',
      slug: 'pomass-noche-crema-blanqueadora',
      sku: 'PA-NOCHE-50',
      description: 'Crema de uso nocturno que ayuda a aclarar la zona íntima y anal.',
      brand: 'pomass',
      category: 'cremas-hidratantes-intimas',
      price: 45900,
      presentation: 'Tubo 50 ml',
      sizeMl: 50,
      usageType: 'aclarante',
      skinType: 'sensible',
      ingredients: 'Niacinamida, alfa-arbutina, vitamina C, manteca de karité.',
      warnings: 'Uso externo nocturno. Evitar exposición solar directa tras la aplicación.',
      stock: 90,
    },
    {
      name: 'Lubricante íntimo base agua',
      slug: 'lubricante-intimo-base-agua',
      sku: 'IC-LUB-100',
      description: 'Lubricante de base agua, compatible con preservativos.',
      brand: 'intimcare',
      category: 'lubricantes',
      price: 32900,
      presentation: 'Frasco 100 ml',
      sizeMl: 100,
      usageType: 'lubricante',
      skinType: 'todo tipo',
      ingredients: 'Agua purificada, glicerina, propilenglicol, carbómero.',
      warnings: 'Uso externo. No apto si hay alergia a alguno de los componentes.',
      stock: 200,
    },
    {
      name: 'Gel refrescante íntimo',
      slug: 'gel-refrescante-intimo',
      sku: 'PS-GEL-75',
      description: 'Gel de frescura inmediata para el día a día.',
      brand: 'pureskin',
      category: 'geles',
      price: 27900,
      presentation: 'Tubo 75 ml',
      sizeMl: 75,
      usageType: 'refrescante',
      skinType: 'normal',
      ingredients: 'Mentol suave, aloe vera, extracto de pepino.',
      warnings: 'Uso externo. Evitar contacto con mucosas.',
      stock: 150,
    },
    {
      name: 'Bálsamo post-depilación',
      slug: 'balsamo-post-depilacion',
      sku: 'PS-POST-50',
      description: 'Calma la piel y reduce la irritación tras la depilación.',
      brand: 'pureskin',
      category: 'cuidado-post-depilacion',
      price: 29900,
      presentation: 'Tubo 50 ml',
      sizeMl: 50,
      usageType: 'calmante',
      skinType: 'sensible',
      ingredients: 'Caléndula, bisabolol, alantoína, aceite de jojoba.',
      warnings: 'Uso externo. Aplicar sobre piel limpia y seca.',
      stock: 80,
    },
    {
      name: 'Jabón íntimo femenino pH balanceado',
      slug: 'jabon-intimo-femenino-ph',
      sku: 'IC-HFEM-200',
      description: 'Limpieza suave que respeta el pH íntimo femenino.',
      brand: 'intimcare',
      category: 'higiene-femenina',
      price: 24900,
      presentation: 'Frasco 200 ml',
      sizeMl: 200,
      usageType: 'higiene',
      skinType: 'sensible',
      ingredients: 'Ácido láctico, extracto de manzanilla, glicerina.',
      warnings: 'Uso externo. No ingerir.',
      stock: 140,
    },
    {
      name: 'Gel de higiene íntima masculina',
      slug: 'gel-higiene-intima-masculina',
      sku: 'IC-HMASC-200',
      description: 'Frescura y limpieza diaria para el hombre.',
      brand: 'intimcare',
      category: 'higiene-masculina',
      price: 24900,
      presentation: 'Frasco 200 ml',
      sizeMl: 200,
      usageType: 'higiene',
      skinType: 'normal',
      ingredients: 'Extracto de mentol, aloe vera, provitamina B5.',
      warnings: 'Uso externo. Evitar contacto con los ojos.',
      stock: 110,
    },
  ]

  for (const p of products) {
    const brandId = await brandBy(p.brand)
    const categoryId = await catBy(p.category)
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { price: p.price, stock: p.stock },
      create: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        brandId,
        categoryId,
        price: p.price,
        presentation: p.presentation,
        sizeMl: p.sizeMl,
        usageType: p.usageType,
        skinType: p.skinType,
        ingredients: p.ingredients,
        warnings: p.warnings,
        stock: p.stock,
      },
    })
  }

  // ----- Cupón de ejemplo -----
  await prisma.coupon.upsert({
    where: { code: 'BIENVENIDA10' },
    update: {},
    create: {
      code: 'BIENVENIDA10',
      type: CouponType.PERCENTAGE,
      value: 10,
      minPurchase: 50000,
      perUserLimit: 1,
      isActive: true,
    },
  })

  // eslint-disable-next-line no-console
  console.log('✅ Seed completado: admin, marcas, categorías, productos y cupón.')
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('❌ Error en el seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
