import type { IHashComparer } from '../providers/i-hash-provider.js';
import type { ITokenProvider } from '../providers/i-token-provider.js';
import type { IUserReader } from '../repository/i-user-repository.js';
import { InvalidCredentialsError } from '../exception/invalid-credentials-error.js';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    cep: string;
  };
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserReader,
    private readonly hashProvider: IHashComparer,
    private readonly tokenProvider: ITokenProvider,
  ) { }

  async execute({ email, password }: LoginInput): Promise<LoginOutput> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await this.hashProvider.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    return {
      token: this.tokenProvider.generate(user.id),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        cep: user.cep,
      },
    };
  }
}
