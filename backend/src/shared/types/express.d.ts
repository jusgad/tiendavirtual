// Rol de usuario tal como viaja en el access token / req.user. Se define aquí
// (y no importado de un módulo ni de Prisma) porque `shared/` es código
// transversal que no depende de ningún dominio concreto; los valores
// coinciden con el `Role` de dominio de `modules/auth` y con el enum de Prisma.
export type SharedRole = 'CLIENT' | 'ADMIN'

// Extiende Express.Request para exponer el usuario autenticado.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: SharedRole
      }
    }
  }
}

export {}
