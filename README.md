# Burger House API

Backend Node.js, TypeScript e PostgreSQL com autenticação por email e senha.

## Executar com Docker

Copie `.env.example` para `.env` e execute:

```bash
docker compose up --build
```

O container da API aguarda o PostgreSQL, aplica as migrations pendentes e inicia
o servidor. O usuário de teste também é criado automaticamente. A API fica
disponível diretamente em `http://localhost:3000` e pelo Nginx em
`http://localhost:8080`.

## Endpoint de login

`POST /login`

```json
{
  "email": "thiago@email.com",
  "password": "Senha123"
}
```

Em caso de sucesso, retorna `200 OK` com uma mensagem, um JWT válido por um dia
e os dados do usuário que podem ser expostos ao cliente:

```json
{
  "success": true,
  "message": "Login realizado com sucesso.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "a76c2afe-5996-48ca-9262-e01e9b68bdee",
      "fullName": "Thiago Rosario",
      "email": "thiago@email.com",
      "cep": "40000-000"
    }
  }
}
```

Credenciais incorretas retornam `401 Unauthorized`; corpos inválidos retornam
`400 Bad Request` com a indicação dos campos que precisam ser corrigidos:

```json
{
  "success": false,
  "message": "Verifique os dados informados.",
  "errors": [
    {
      "field": "email",
      "message": "Informe um email válido."
    }
  ]
}
```

E-mails são normalizados para letras minúsculas antes da consulta. As senhas são
comparadas com bcrypt e nunca retornam na resposta.

## Desenvolvimento local

Com o PostgreSQL configurado em `DATABASE_URL`:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Comandos de verificação:

```bash
npm test
npm run typecheck
npm run build
```

## Organização

O fluxo segue `Route → LoginController → LoginUseCase → IUserRepository`. O caso
de uso depende somente dos contratos de repositório, hash e token; PostgreSQL,
bcrypt, JWT, Express e Zod ficam nas camadas externas.
