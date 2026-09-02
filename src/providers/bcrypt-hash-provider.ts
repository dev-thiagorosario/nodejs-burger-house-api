import { compare } from 'bcryptjs';

import type { IHashProvider } from './i-hash-provider.js';

export class BcryptHashProvider implements IHashProvider {
  compare(plainText: string, hash: string): Promise<boolean> {
    return compare(plainText, hash);
  }
}
