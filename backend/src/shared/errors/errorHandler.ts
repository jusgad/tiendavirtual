import { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError } from './AppError'
import { logger } from '../logger/logger'

/** 404 para rutas no registradas. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  })
}

/** Middleware central de errores: única salida de errores del sistema. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Errores de dominio/aplicación conocidos
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    })
  }

  // Errores de validación de Zod (si algún schema se valida fuera del middleware)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: err.flatten() },
    })
  }

  // Violaciones conocidas de Prisma → mensajes limpios
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Ya existe un registro con esos datos únicos' },
      })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' },
      })
    }
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'No se puede eliminar: el recurso está referenciado por otros registros',
        },
      })
    }
  }

  // Cualquier otro error: no filtrar detalles internos al cliente
  logger.error({ err }, 'Error no controlado')
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  })
}
