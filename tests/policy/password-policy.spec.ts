import { describe, expect, it } from 'vitest';

import {
  InvalidPasswordError,
  PasswordPolicy,
} from '../../src/policy/password-policy.js';

describe('PasswordPolicy', () => {
  it('accepts a password that satisfies every rule', () => {
    expect(PasswordPolicy.validate('Senha123')).toEqual([]);
    expect(() => PasswordPolicy.assertValid('Senha123')).not.toThrow();
  });

  it('reports a password shorter than eight characters', () => {
    expect(PasswordPolicy.validate('short')).toEqual([
      {
        code: 'minimum_length',
        message: 'A senha deve conter pelo menos 8 caracteres.',
      },
    ]);
    expect(() => PasswordPolicy.assertValid('short')).toThrow(
      InvalidPasswordError,
    );
  });

  it('measures the bcrypt limit in bytes instead of characters', () => {
    expect(PasswordPolicy.validate('á'.repeat(36))).toEqual([]);
    expect(PasswordPolicy.validate('á'.repeat(37))).toEqual([
      {
        code: 'bcrypt_byte_limit',
        message: 'A senha deve conter no máximo 72 bytes.',
      },
    ]);
  });
});
