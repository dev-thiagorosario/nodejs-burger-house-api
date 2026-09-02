import { Router } from 'express';

import { LoginController } from '../controller/login-controller.js';
import { databaseUrl, jwtSecret } from '../core/config.js';
import { createPostgresPool } from '../database/data-source.js';
import { BcryptHashProvider } from '../providers/bcrypt-hash-provider.js';
import { JwtTokenProvider } from '../providers/jwt-token-provider.js';
import { PostgresUserRepository } from '../repository/postgres-user-repository.js';
import { LoginUseCase } from '../use-case/login-use-case.js';

const pool = createPostgresPool(databaseUrl);
const userRepository = new PostgresUserRepository(pool);
const hashProvider = new BcryptHashProvider();
const tokenProvider = new JwtTokenProvider(jwtSecret);
const loginUseCase = new LoginUseCase(
  userRepository,
  hashProvider,
  tokenProvider,
);
const loginController = new LoginController(loginUseCase);

const router = Router();

router.post('/login', loginController.handle);

export function closeApiDependencies(): Promise<void> {
  return pool.end();
}

export default router;
