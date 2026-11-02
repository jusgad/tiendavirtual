import { UploadProductImageUseCase } from '../../../src/modules/catalog/application/productUseCases'
import { BadRequestError } from '../../../src/shared/errors/AppError'
import { FakeImageStorage } from './fakes'

function jpeg(bytes = 10) {
  return { buffer: Buffer.alloc(bytes, 1), mimeType: 'image/jpeg' }
}

describe('UploadProductImageUseCase', () => {
  it('sube una imagen válida y devuelve la URL del almacenamiento', async () => {
    const storage = new FakeImageStorage()
    const uc = new UploadProductImageUseCase(storage)

    const resultado = await uc.execute(jpeg())

    expect(resultado).toEqual(storage.respuesta)
    expect(storage.recibido?.mimeType).toBe('image/jpeg')
  })

  it('acepta PNG y WEBP además de JPEG', async () => {
    const storage = new FakeImageStorage()
    const uc = new UploadProductImageUseCase(storage)

    await uc.execute({ buffer: Buffer.alloc(5, 1), mimeType: 'image/png' })
    await uc.execute({ buffer: Buffer.alloc(5, 1), mimeType: 'image/webp' })

    expect(storage.recibido?.mimeType).toBe('image/webp')
  })

  it('rechaza un tipo de archivo que no es imagen permitida', async () => {
    const storage = new FakeImageStorage()
    const uc = new UploadProductImageUseCase(storage)

    await expect(
      uc.execute({ buffer: Buffer.alloc(10, 1), mimeType: 'application/pdf' }),
    ).rejects.toThrow(BadRequestError)
    // Nunca debe llegar a intentar subirse: la validación corta antes.
    expect(storage.recibido).toBeNull()
  })

  it('rechaza un archivo vacío', async () => {
    const storage = new FakeImageStorage()
    const uc = new UploadProductImageUseCase(storage)

    await expect(uc.execute({ buffer: Buffer.alloc(0), mimeType: 'image/jpeg' })).rejects.toThrow(
      BadRequestError,
    )
  })

  it('rechaza un archivo de más de 5 MB', async () => {
    const storage = new FakeImageStorage()
    const uc = new UploadProductImageUseCase(storage)

    await expect(uc.execute(jpeg(5 * 1024 * 1024 + 1))).rejects.toThrow(BadRequestError)
  })

  it('acepta justo en el límite de 5 MB', async () => {
    const storage = new FakeImageStorage()
    const uc = new UploadProductImageUseCase(storage)

    await expect(uc.execute(jpeg(5 * 1024 * 1024))).resolves.toEqual(storage.respuesta)
  })

  it('propaga el error si el almacenamiento falla', async () => {
    const storage = new FakeImageStorage()
    storage.upload = async () => {
      throw new Error('Supabase Storage respondió 500')
    }
    const uc = new UploadProductImageUseCase(storage)

    await expect(uc.execute(jpeg())).rejects.toThrow('Supabase Storage respondió 500')
  })
})
