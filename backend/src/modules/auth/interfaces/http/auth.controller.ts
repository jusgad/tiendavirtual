import { Request, Response } from 'express'
import { env } from '../../../../shared/config/env'
import { UnauthorizedError } from '../../../../shared/errors/AppError'
import { RegisterUserUseCase } from '../../application/registerUser.usecase'
import { LoginUserUseCase } from '../../application/loginUser.usecase'
import { LogoutUseCase, RefreshTokensUseCase } from '../../application/tokenFlows.usecase'
import {
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
} from '../../application/passwordReset.usecase'

// El controlador solo traduce HTTP <-> casos de uso. Sin lógica de negocio.
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshTokens: RefreshTokensUseCase,
    private readonly logout: LogoutUseCase,
    private readonly requestReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
  ) {}

  register = async (req: Request, res: Response) => {
    const result = await this.registerUser.execute(req.body)
    res.status(201).json(result)
  }

  login = async (req: Request, res: Response) => {
    const result = await this.loginUser.execute(req.body)
    res.status(200).json(result)
  }

  refresh = async (req: Request, res: Response) => {
    const result = await this.refreshTokens.execute(req.body.refreshToken)
    res.status(200).json(result)
  }

  logoutHandler = async (req: Request, res: Response) => {
    await this.logout.execute(req.body.refreshToken)
    res.status(204).send()
  }

  forgotPassword = async (req: Request, res: Response) => {
    const result = await this.requestReset.execute(req.body.email)
    // Respuesta genérica siempre (no revela si el correo existe).
    const body: Record<string, unknown> = {
      message: 'Si el correo existe, enviaremos instrucciones para restablecer la contraseña',
    }
    // En entornos no productivos exponemos el token para poder probar el flujo.
    if (env.NODE_ENV !== 'production' && result) {
      body.devResetToken = result.rawToken
    }
    res.status(200).json(body)
  }

  resetPasswordHandler = async (req: Request, res: Response) => {
    await this.resetPassword.execute(req.body.token, req.body.password)
    res.status(200).json({ message: 'Contraseña actualizada correctamente' })
  }

  // Perfil del usuario autenticado (usa el guard).
  me = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError()
    res.status(200).json({ user: req.user })
  }
}
