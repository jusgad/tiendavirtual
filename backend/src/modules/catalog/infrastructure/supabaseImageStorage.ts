import crypto from 'node:crypto'
import { ServiceUnavailableError } from '../../../shared/errors/AppError'
import { ImageStorage, UploadedImage, UploadedImageInput } from '../domain/ports'

export interface SupabaseStorageConfig {
  url: string
  serviceRoleKey: string
  bucket: string
}

const EXTENSION_POR_TIPO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * Sube imágenes al Storage de Supabase por su API REST, sin el SDK: es la
 * única llamada que hace falta, y evita una dependencia nueva solo para eso
 * (`fetch` ya es global en Node 20+, que es lo que usa este proyecto).
 *
 * El bucket debe existir de antes y estar marcado como público en el panel
 * de Supabase (Storage → el bucket → Make public): sin eso, la URL que se
 * guarda en el producto no abriría para quien visita la tienda. Crearlo es
 * un paso de configuración de la cuenta, no algo que este código pueda
 * hacer por sí mismo.
 */
export class SupabaseImageStorage implements ImageStorage {
  constructor(private readonly config: SupabaseStorageConfig) {}

  async upload({ buffer, mimeType }: UploadedImageInput): Promise<UploadedImage> {
    const extension = EXTENSION_POR_TIPO[mimeType]
    // El caso de uso ya rechazó cualquier tipo que no esté en el mapa, pero
    // TypeScript no lo sabe: sin esta guarda, un tipo desconocido subiría
    // con un nombre de archivo roto, como "foo.undefined".
    if (!extension) throw new Error(`Tipo de imagen sin extensión conocida: ${mimeType}`)

    // El nombre lo genera este adaptador, NUNCA el que trae el archivo: un
    // nombre original con `../` o con el de la foto de otro producto podría
    // escapar de la carpeta o sobrescribir una imagen ajena. `x-upsert:
    // false` es la segunda barrera, por si dos subidas generaran el mismo
    // UUID (prácticamente imposible, pero gratis de pedir).
    const nombreArchivo = `${crypto.randomUUID()}.${extension}`

    const respuesta = await fetch(
      `${this.config.url}/storage/v1/object/${this.config.bucket}/${nombreArchivo}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.serviceRoleKey}`,
          apikey: this.config.serviceRoleKey,
          'Content-Type': mimeType,
          'x-upsert': 'false',
        },
        body: buffer,
      },
    )

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      throw new ServiceUnavailableError(
        `No se pudo subir la imagen a Supabase Storage (respondió ${respuesta.status}). ` +
          'Inténtalo de nuevo en un momento; si sigue fallando, revisa el bucket en Supabase. ' +
          `Detalle: ${detalle}`,
      )
    }

    return {
      url: `${this.config.url}/storage/v1/object/public/${this.config.bucket}/${nombreArchivo}`,
    }
  }
}

/**
 * Se usa mientras `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` no estén
 * configuradas. A diferencia del correo (que se calla y escribe en el log:
 * es un efecto secundario de algo que ya pasó), subir una imagen es la
 * propia petición del panel —quedarse callado dejaría a quien administra
 * pensando que subió la foto cuando no pasó nada—, así que avisa con un
 * error claro en vez de fallar en silencio.
 */
export class NotConfiguredImageStorage implements ImageStorage {
  async upload(): Promise<UploadedImage> {
    throw new ServiceUnavailableError(
      'Subir imágenes no está configurado todavía: define SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y ' +
        'SUPABASE_STORAGE_BUCKET en el servidor. Mientras tanto, pega la URL de la imagen a mano.',
    )
  }
}
