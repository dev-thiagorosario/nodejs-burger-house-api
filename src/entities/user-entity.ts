const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CEP_PATTERN = /^[0-9]{5}-[0-9]{3}$/;

export interface UserProps {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  cep: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InvalidUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserError';
  }
}

export class User {
  public readonly id: string;
  public readonly fullName: string;
  public readonly email: string;
  public readonly passwordHash: string;
  public readonly cep: string;

  private readonly createdAtValue: Date;
  private readonly updatedAtValue: Date;

  constructor(props: UserProps) {
    const id = props.id.trim();
    const fullName = props.fullName.trim();
    const email = props.email.trim().toLowerCase();

    if (!UUID_PATTERN.test(id)) {
      throw new InvalidUserError('O identificador do usuário deve ser um UUID.');
    }

    if (fullName.length < 2 || fullName.length > 120) {
      throw new InvalidUserError(
        'O nome completo deve conter entre 2 e 120 caracteres.',
      );
    }

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      throw new InvalidUserError('O email do usuário é inválido.');
    }

    if (!props.passwordHash || props.passwordHash.length > 255) {
      throw new InvalidUserError('O hash da senha do usuário é inválido.');
    }

    if (!CEP_PATTERN.test(props.cep)) {
      throw new InvalidUserError('O CEP deve seguir o formato 00000-000.');
    }

    if (
      Number.isNaN(props.createdAt.getTime()) ||
      Number.isNaN(props.updatedAt.getTime())
    ) {
      throw new InvalidUserError('As datas do usuário são inválidas.');
    }

    if (props.updatedAt.getTime() < props.createdAt.getTime()) {
      throw new InvalidUserError(
        'A data de atualização não pode anteceder a data de criação.',
      );
    }

    this.id = id;
    this.fullName = fullName;
    this.email = email;
    this.passwordHash = props.passwordHash;
    this.cep = props.cep;
    this.createdAtValue = new Date(props.createdAt);
    this.updatedAtValue = new Date(props.updatedAt);
  }

  get createdAt(): Date {
    return new Date(this.createdAtValue);
  }

  get updatedAt(): Date {
    return new Date(this.updatedAtValue);
  }
}
