# Burger House API

Backend Node.js, TypeScript e PostgreSQL. Nesta etapa, a aplicação implementa
somente a criação de usuários.

## Executar com Docker

Copie `.env.example` para `.env` e execute:

```bash
docker compose up --build
```

O container da API aguarda o PostgreSQL, aplica as migrations pendentes e inicia
o servidor. A API fica disponível diretamente em `http://localhost:3000` e pelo
Nginx em `http://localhost:8080`.

## Endpoint

`POST /users`

```json
{
  "fullName": "Thiago Rosario",
  "email": "thiago@email.com",
  "password": "123456",
  "cep": "40000-000"
}
```

Em caso de sucesso, retorna `201 Created`. A resposta nunca inclui a senha nem o
hash. `confirmPassword`, se enviado por um cliente, é descartado na borda HTTP e
não faz parte do DTO, da entidade ou da persistência.

E-mails são normalizados para letras minúsculas. A aplicação faz a verificação
prévia e o banco mantém um índice único case-insensitive para evitar duplicidade
inclusive em requisições concorrentes.

## Desenvolvimento local

Com o PostgreSQL configurado em `DATABASE_URL`:

```bash
npm install
npm run db:migrate
npm run dev
```

Comandos de verificação:

```bash
npm test
npm run typecheck
npm run build
```

## Organização

O fluxo segue `Route → Controller → CreateUserUseCase → UserRepository →
PostgreSQL`. Domínio e aplicação não importam Express, PostgreSQL, Zod ou bcrypt;
as implementações dessas dependências ficam nas camadas de apresentação e
infraestrutura.
