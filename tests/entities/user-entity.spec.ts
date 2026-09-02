import { describe, expect, it } from 'vitest';

import {
  InvalidUserError,
  User,
  type UserProps,
} from '../../src/entities/user-entity.js';

const validProps: UserProps = {
  id: 'a76c2afe-5996-48ca-9262-e01e9b68bdee',
  fullName: 'Thiago Rosario',
  email: 'thiago@email.com',
  passwordHash: '$2b$10$stored-password-hash',
  cep: '40000-000',
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T13:00:00.000Z'),
};

describe('User', () => {
  it('normalizes the name and email', () => {
    const user = new User({
      ...validProps,
      fullName: '  Thiago Rosario  ',
      email: '  THIAGO@EMAIL.COM  ',
    });

    expect(user.fullName).toBe('Thiago Rosario');
    expect(user.email).toBe('thiago@email.com');
  });

  it.each([
    ['id', { id: 'not-an-uuid' }],
    ['full name', { fullName: ' ' }],
    ['email', { email: 'not-an-email' }],
    ['password hash', { passwordHash: '' }],
    ['CEP', { cep: '40000000' }],
    ['created date', { createdAt: new Date('invalid') }],
  ])('rejects an invalid %s', (_field, changes) => {
    expect(() => new User({ ...validProps, ...changes })).toThrow(
      InvalidUserError,
    );
  });

  it('rejects an update date earlier than the creation date', () => {
    expect(
      () =>
        new User({
          ...validProps,
          updatedAt: new Date('2026-09-01T11:59:59.999Z'),
        }),
    ).toThrow(InvalidUserError);
  });

  it('protects its dates from external mutation', () => {
    const user = new User(validProps);
    const createdAt = user.createdAt;

    createdAt.setUTCFullYear(2030);

    expect(user.createdAt).toEqual(validProps.createdAt);
  });
});
