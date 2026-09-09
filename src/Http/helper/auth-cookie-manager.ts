import type { Response } from 'express';

import type { IAuthCookieManager } from '../../providers/i-auth-cookie-manager.js';
import { clearAuthCookie } from './auth-cookie.js';

export class AuthCookieManager implements IAuthCookieManager {
  constructor(private readonly response: Response) {}

  clear(): void {
    clearAuthCookie(this.response);
  }
}
