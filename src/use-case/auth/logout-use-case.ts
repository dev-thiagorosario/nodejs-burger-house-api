import type { IAuthCookieManager } from '../providers/i-auth-cookie-manager.js';

export interface LogoutOutput {
  success: boolean;
}

export class LogoutUseCase {
  async execute(cookieManager: IAuthCookieManager): Promise<LogoutOutput> {
    cookieManager.clear();

    return { success: true };
  }
}
