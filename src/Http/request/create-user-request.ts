import { z } from 'zod';

import { PasswordPolicy } from '../../policy/password-policy.js';

export const createUserBodySchema = z.strictObject({
  fullName: z
    .string('O nome completo deve ser informado.')
    .trim()
    .min(2, 'O nome completo deve conter pelo menos 2 caracteres.')
    .max(120, 'O nome completo deve conter no máximo 120 caracteres.'),
  email: z
    .string('O email deve ser informado.')
    .trim()
    .min(1, 'O email deve ser informado.')
    .max(254, 'O email deve conter no máximo 254 caracteres.')
    .pipe(z.email('Informe um email válido.'))
    .transform((email) => email.toLowerCase()),
  password: z
    .string('A senha deve ser informada.')
    .superRefine((password, context) => {
      for (const violation of PasswordPolicy.validate(password)) {
        context.addIssue({
          code: 'custom',
          message: violation.message,
        });
      }
    }),
  cep: z
    .string('O CEP deve ser informado.')
    .trim()
    .regex(/^[0-9]{5}-[0-9]{3}$/, 'O CEP deve seguir o formato 00000-000.'),
});

export type CreateUserRequest = z.infer<typeof createUserBodySchema>;
