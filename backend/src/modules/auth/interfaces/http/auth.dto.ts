import { z } from 'zod'

const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número')

export const registerSchema = z.object({
  email: z.string().email('Correo inválido').toLowerCase(),
  password,
  firstName: z.string().min(1, 'Nombre requerido').max(80),
  lastName: z.string().min(1, 'Apellido requerido').max(80),
  phone: z.string().min(7).max(20).optional(),
  // Verificación de edad: declaración obligatoria "soy mayor de 18".
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Debes confirmar que eres mayor de 18 años' }),
  }),
})

export const loginSchema = z.object({
  email: z.string().email('Correo inválido').toLowerCase(),
  password: z.string().min(1, 'Contraseña requerida'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token requerido'),
})

export const requestResetSchema = z.object({
  email: z.string().email('Correo inválido').toLowerCase(),
})

export const resetSchema = z.object({
  token: z.string().min(10, 'Token requerido'),
  password,
})

export type RegisterBody = z.infer<typeof registerSchema>
export type LoginBody = z.infer<typeof loginSchema>
