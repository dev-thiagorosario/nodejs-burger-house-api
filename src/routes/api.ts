import { Router } from 'express';
import { productImagesRouter } from './product-images.js';

import { CreateUserController } from '../Http/controller/identity/create-user-controller.js';
import { GetCurrentUserController } from '../Http/controller/identity/get-current-user-controller.js';
import { LoginController } from '../Http/controller/auth/login-controller.js';
import { LogoutController } from '../Http/controller/auth/logout-controller.js';
import { AuthMiddleware } from '../Http/middleware/auth-middleware.js';
import { databaseUrl, jwtSecret } from '../core/config.js';
import { createPostgresPool } from '../database/data-source.js';
import { BcryptHashProvider } from '../providers/bcrypt-hash-provider.js';
import { JwtTokenProvider } from '../providers/jwt-token-provider.js';
import { PostgresUserRepository } from '../postgres-repository/postgres-user-repository.js';
import { CreateUserUseCase } from '../use-case/identity/create-user-use-case.js';
import { GetCurrentUserUseCase } from '../use-case/identity/get-current-user-use-case.js';
import { LoginUseCase } from '../use-case/auth/login-use-case.js';
import { LogoutUseCase } from '../use-case/auth/logout-use-case.js';

import { PostgresProductRepository } from '../postgres-repository/postgres-product-repository.js';
import { CreateProductController } from '../Http/controller/product/create-product-controller.js';
import { CreateProductUseCase } from '../use-case/product/create-product-use-case.js';
import { GetProductByIdController } from '../Http/controller/product/get-product-by-id-controller.js';
import { GetProductByIdUseCase } from '../use-case/product/get-product-by-id-use-case.js';
import { ListProductsController } from '../Http/controller/product/list-products-controller.js';
import { ListProductsUseCase } from '../use-case/product/list-products-use-case.js';
import { UpdateProductController } from '../Http/controller/product/update-product-controller.js';
import { UpdateProductUseCase } from '../use-case/product/update-product-use-case.js';
import { DeleteProductController } from '../Http/controller/product/delete-product-controller.js';
import { DeleteProductUseCase } from '../use-case/product/delete-product-use-case.js';
import { PostgresCategoryRepository } from '../postgres-repository/postgres-category-repository.js';
import { ListCategoriesUseCase } from '../use-case/category/list-categories-use-case.js';
import { ListCategoriesController } from '../Http/controller/category/list-categories-controller.js';
import { CartSummaryController } from '../Http/controller/cart/cart-summary-controller.js';
import { BuildCartSummaryUseCase } from '../use-case/cart/build-cart-summary-use-case.js';

const pool = createPostgresPool(databaseUrl);
const userRepository = new PostgresUserRepository(pool);
const hashProvider = new BcryptHashProvider();
const tokenProvider = new JwtTokenProvider(jwtSecret);
const authMiddleware = new AuthMiddleware(tokenProvider);
const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);
const getCurrentUserController = new GetCurrentUserController(getCurrentUserUseCase);
const loginUseCase = new LoginUseCase(
  userRepository,
  hashProvider,
  tokenProvider,
);
const loginController = new LoginController(loginUseCase);
const logoutController = new LogoutController(new LogoutUseCase());
const createUserUseCase = new CreateUserUseCase(userRepository, hashProvider);
const createUserController = new CreateUserController(createUserUseCase);

const productRepository = new PostgresProductRepository(pool);
const createProductUseCase = new CreateProductUseCase(productRepository);
const createProductController = new CreateProductController(createProductUseCase);
const getProductByIdUseCase = new GetProductByIdUseCase(productRepository);
const getProductByIdController = new GetProductByIdController(getProductByIdUseCase);
const listProductsUseCase = new ListProductsUseCase(productRepository);
const listProductsController = new ListProductsController(listProductsUseCase);
const updateProductUseCase = new UpdateProductUseCase(productRepository);
const updateProductController = new UpdateProductController(updateProductUseCase);
const deleteProductUseCase = new DeleteProductUseCase(productRepository);
const deleteProductController = new DeleteProductController(deleteProductUseCase);
const buildCartSummaryUseCase = new BuildCartSummaryUseCase(productRepository);
const cartSummaryController = new CartSummaryController(buildCartSummaryUseCase);

const categoryRepository = new PostgresCategoryRepository(pool);
const listCategoriesUseCase = new ListCategoriesUseCase(categoryRepository);
const listCategoriesController = new ListCategoriesController(listCategoriesUseCase);

const router = Router();
router.use(productImagesRouter(pool));

router.get('/auth/me', authMiddleware.handle, getCurrentUserController.handle);

router.post('/login', loginController.handle);
router.post('/logout', logoutController.handle);

router.post('/register', createUserController.handle);

router.post('/register-product', createProductController.handle);
router.get('/list-product/:id', getProductByIdController.handle);
router.get('/list-products', listProductsController.handle);
router.get('/list-categories', listCategoriesController.handle);
router.patch('/update-products/:id', updateProductController.handle);
router.delete('/delete-products/:id', deleteProductController.handle);
router.post('/cart/summary', cartSummaryController.handle);

export function closeApiDependencies(): Promise<void> {
  return pool.end();
}

export default router;
