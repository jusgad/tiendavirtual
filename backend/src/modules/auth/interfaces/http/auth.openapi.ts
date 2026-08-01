import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

// Documentación OpenAPI del módulo Auth. Se registra al importar el módulo.
registerSchemas({
  AuthTokens: {
    type: 'object',
    properties: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
    },
  },
  SafeUser: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      phone: { type: 'string', nullable: true },
      role: { type: 'string', enum: ['CLIENT', 'ADMIN'] },
      ageConfirmed: { type: 'boolean' },
      isActive: { type: 'boolean' },
    },
  },
})

const jsonBody = (schema: object) => ({
  required: true,
  content: { 'application/json': { schema } },
})

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
})

registerPaths({
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Registrar un nuevo cliente',
      requestBody: jsonBody({
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'ageConfirmed'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' },
          ageConfirmed: { type: 'boolean', description: 'Debe ser true (mayor de 18)' },
        },
      }),
      responses: {
        201: {
          description: 'Usuario creado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/SafeUser' },
                  tokens: { $ref: '#/components/schemas/AuthTokens' },
                },
              },
            },
          },
        },
        400: errorResponse('Datos inválidos o edad no confirmada'),
        409: errorResponse('El correo ya está registrado'),
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Iniciar sesión',
      requestBody: jsonBody({
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      }),
      responses: {
        200: {
          description: 'Sesión iniciada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/SafeUser' },
                  tokens: { $ref: '#/components/schemas/AuthTokens' },
                },
              },
            },
          },
        },
        401: errorResponse('Credenciales inválidas'),
      },
    },
  },
  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Rotar tokens con el refresh token',
      requestBody: jsonBody({
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      }),
      responses: {
        200: {
          description: 'Nuevos tokens',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { tokens: { $ref: '#/components/schemas/AuthTokens' } },
              },
            },
          },
        },
        401: errorResponse('Refresh token inválido o expirado'),
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Cerrar sesión (revoca el refresh token)',
      requestBody: jsonBody({
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      }),
      responses: { 204: { description: 'Sesión cerrada' } },
    },
  },
  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Solicitar recuperación de contraseña',
      requestBody: jsonBody({
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      }),
      responses: { 200: { description: 'Respuesta genérica (no revela si el correo existe)' } },
    },
  },
  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Restablecer la contraseña con un token',
      requestBody: jsonBody({
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      }),
      responses: {
        200: { description: 'Contraseña actualizada' },
        400: errorResponse('Token inválido o expirado'),
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Perfil del usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Datos del usuario en el token' },
        401: errorResponse('No autenticado'),
      },
    },
  },
})
