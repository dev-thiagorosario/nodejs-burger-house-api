import { compare, hash as bcryptHash } from 'bcryptjs';

import type { IHashProvider } from './i-hash-provider.js';

export class BcryptHashProvider implements IHashProvider {
  constructor(private readonly saltRounds = 12) {
    if (!Number.isInteger(saltRounds) || saltRounds < 4 || saltRounds > 31) {
      throw new Error('O custo do bcrypt deve ser um inteiro entre 4 e 31.');
    }
  }

  hash(plainText: string): Promise<string> {
    return bcryptHash(plainText, this.saltRounds);
  }

  compare(plainText: string, hash: string): Promise<boolean> {
    return compare(plainText, hash);
  }
}
