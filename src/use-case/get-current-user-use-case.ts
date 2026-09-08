import { UserNotFoundError } from '../exception/user-not-found-error.js';
import type { IUserReader } from '../repository/i-user-repository.js';

export interface GetCurrentUserOutput {
  id: string;
  fullName: string;
  email: string;
  cep: string;
}


export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: IUserReader) {}

  async execute(userId: string): Promise<GetCurrentUserOutput> {

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      cep: user.cep,
    };
  }
}
