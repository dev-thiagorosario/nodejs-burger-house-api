import type { CookieOptions, Response } from "express";

export const AUTH_COOKIE_NAME = 'access_token';

const ONE_DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;


  function getAuthCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ONE_DAY_IN_MILLISECONDS,
      path: '/',
    }
}

  export function setAuthCookie(response: Response, token:string): void
  {
    response.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(),);
  }

  export function clearAuthCookie(response: Response): void
  {
    response.clearCookie(AUTH_COOKIE_NAME,{ ...getAuthCookieOptions(), maxAge: undefined });
  }

