const MINIMUM_PASSWORD_LENGTH = 8;
const MAXIMUM_BCRYPT_PASSWORD_BYTES = 72;

export interface PasswordPolicyViolation {
  code: 'minimum_length' | 'bcrypt_byte_limit';
  message: string;
}

export class InvalidPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

export class PasswordPolicy {
  static validate(password: string): PasswordPolicyViolation[] {
    const violations: PasswordPolicyViolation[] = [];

    if (!this.hasMinimumLength(password)) {
      violations.push({
        code: 'minimum_length',
        message: `A senha deve conter pelo menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`,
      });
    }

    if (!this.isWithinBcryptByteLimit(password)) {
      violations.push({
        code: 'bcrypt_byte_limit',
        message: `A senha deve conter no máximo ${MAXIMUM_BCRYPT_PASSWORD_BYTES} bytes.`,
      });
    }

    return violations;
  }

  static assertValid(password: string): void {
    const violation = this.validate(password)[0];

    if (violation) {
      throw new InvalidPasswordError(violation.message);
    }
  }

  private static hasMinimumLength(password: string): boolean {
    return password.length >= MINIMUM_PASSWORD_LENGTH;
  }

  private static isWithinBcryptByteLimit(password: string): boolean {
    return Buffer.byteLength(password, 'utf8') <= MAXIMUM_BCRYPT_PASSWORD_BYTES;
  }
}
