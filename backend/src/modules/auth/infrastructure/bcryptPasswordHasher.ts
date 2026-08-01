import bcrypt from 'bcryptjs'
import { PasswordHasher } from '../domain/ports'

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly saltRounds: number) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds)
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}
