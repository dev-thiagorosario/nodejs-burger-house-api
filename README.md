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

## Endpoint de cadastro

`POST /register`

```json
{
  "fullName": "Thiago Rosario",
  "email": "thiago@email.com",
  "password": "Senha123",
  "cep": "40000-000"
}
```

Em caso de sucesso, retorna `201 Created` somente com os dados públicos do novo
usuário:

```json
{
  "success": true,
  "message": "Usuário criado com sucesso.",
  "data": {
    "user": {
      "id": "a76c2afe-5996-48ca-9262-e01e9b68bdee",
      "fullName": "Thiago Rosario",
      "email": "thiago@email.com",
      "cep": "40000-000",
      "isAdmin": false
    }
  }
}
```

Corpos inválidos retornam `400 Bad Request`. Um email já cadastrado retorna
`409 Conflict`. A senha deve ter pelo menos oito caracteres, respeitar o limite
de 72 bytes do bcrypt, é armazenada apenas como hash e nunca aparece na resposta.

## Endpoint de login

`POST /login`

```json
{
  "email": "thiago@email.com",
  "password": "Senha123"
}
```

Em caso de sucesso, define o cookie HttpOnly `access_token` com um JWT válido
por um dia e retorna `200 OK` com uma mensagem e os dados públicos do usuário:

```json
{
  "success": true,
  "message": "Login realizado com sucesso.",
  "data": {
    "user": {
      "id": "a76c2afe-5996-48ca-9262-e01e9b68bdee",
      "fullName": "Thiago Rosario",
      "email": "thiago@email.com",
      "cep": "40000-000",
      "isAdmin": false
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

## Endpoint de logout

`POST /logout`

Não exige corpo e remove o cookie `access_token`. Retorna `200 OK` mesmo se o
cookie estiver ausente, inválido ou expirado:

```json
{
  "success": true,
  "message": "Logout realizado com sucesso."
}
```

No frontend, envie a requisição com `credentials: 'include'` para que o navegador
processe o cookie quando a API estiver em outra origem. O logout remove o cookie,
mas não revoga cópias do JWT, que permanecem válidas até a expiração.

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

Os fluxos seguem `Route → Controller → UseCase → IUserRepository`. Os casos de
uso dependem somente dos contratos de repositório, hash e token; PostgreSQL,
bcrypt, JWT, Express e Zod ficam nas camadas externas.

O cadastro público cria usuários com `isAdmin: false` e não aceita esse campo no corpo da requisição. O caso de uso de criação aceita `isAdmin` opcionalmente para chamadas internas autorizadas. Cadastro, login e consulta do usuário atual retornam `isAdmin`.

### Produtos e imagens no PostgreSQL

`product_images` é a única fonte de imagens: `product_id` referencia o produto,
`variant` identifica `desktop` ou `mobile`, `file_name` guarda o nome do arquivo,
`mime_type` o tipo e `data` os bytes. Há no máximo uma imagem por versão e nenhuma
regra de imagem principal. Não existem colunas de caminho ou URL nessa tabela.
`products.image_alt` continua armazenando o texto alternativo compartilhado.

Criação: `POST /register-product` (201).

```json
{
  "id": "meu-burger",
  "name": "Meu Burger",
  "description": "Pão, carne e queijo",
  "price": 25.9,
  "categoryId": 1,
  "imageAlt": "Hambúrguer com queijo"
}
```

`imageAlt` e `isActive` são opcionais na criação. URLs e metadados de imagens não
são aceitos nos corpos de criação/atualização: envie os bytes pela rota de upload.
Os antigos inputs `imageUrl` e `mobileImageUrl` agora retornam 400.

- `GET /list-products`, com filtro opcional `?categoryId=1`.
- `GET /list-product/:id`.
- `PATCH /update-products/:id`, com os campos de produto a modificar.
- `DELETE /delete-products/:id` (204): desativa o produto e preserva suas imagens
  e referências de pedidos. Uma exclusão física no banco remove imagens por cascade.

Os envelopes continuam `data.product` ou `data.products`. Cada produto retorna
`id`, `name`, `description`, `price`, `categoryId`, `imageAlt`, `isActive`,
`createdAt`, `updatedAt` e `images`. Exemplo do campo `images` após upload:

```json
{
  "images": [
    {
      "variant": "desktop",
      "fileName": "burger.jpg",
      "mimeType": "image/jpeg",
      "url": "/products/meu-burger/images/desktop"
    }
  ]
}
```

Apenas imagens realmente persistidas aparecem nessa coleção. Sem upload,
`images` é `[]`; pode haver somente desktop ou somente mobile. O frontend deve
usar `images.find(image => image.variant === 'desktop')?.url`, combinando o
caminho com a origem da API. Os bytes não são carregados na listagem; os metadados
são agregados em uma única consulta SQL, inclusive para vários produtos.

`GET /products/:id/images/:variant` retorna os bytes com o MIME armazenado,
ou 404. `PUT` na mesma rota insere/substitui a versão; `DELETE` remove somente
a versão indicada (204, ou 404 se ausente). São aceitos JPEG, PNG, WebP, GIF e
AVIF até 10 MB, no corpo binário, com `Content-Type` correspondente e
`X-File-Name` opcional.

```sh
curl -X PUT http://localhost:3000/products/meu-burger/images/desktop \
  -H 'Content-Type: image/jpeg' \
  -H 'X-File-Name: burger.jpg' \
  --data-binary @storage/assets/Imagem7RealSize.jpg

curl -X DELETE http://localhost:3000/products/meu-burger/images/mobile
```

O upload retorna `data: { variant, fileName, mimeType, url }`. No frontend, envie
um `File` diretamente como `body` de `fetch`. As rotas mantêm o acesso público
existente. Upload e remoção atualizam o timestamp do produto na mesma transação;
qualquer falha reverte a escrita. Cadastro e upload continuam sendo requisições
separadas: um upload malsucedido não apaga o produto previamente cadastrado.
Os seeders criam produtos e suas imagens juntos na mesma transação.

### Migração das imagens antigas

A migration incremental `010-remove-product-image-columns` preserva todas as
migrations anteriores. Execute `npm run db:migrate` com a versão nova da aplicação
em uma janela de manutenção, pois o código antigo depende das colunas removidas.

Antes do DROP, a migration bloqueia escritas em `products` e `product_images`,
percorre as versões de cada produto e preserva registros de imagem já existentes.
Para versões faltantes, importa arquivos de `/assets/`, `/assets_drinks/` e
`/assets_sides/` a partir de `storage`, com detecção do MIME e `ON CONFLICT DO NOTHING`.
Só remove `image` e `mobile_image` após confirmar que todos os produtos têm ambas
as versões persistidas. `image_alt`, os produtos e os pedidos são preservados.

Um arquivo ausente, inválido, fora de `storage`, uma URL externa ou uma rota da API
sem registro correspondente abortam toda a transação, mantendo as colunas antigas.
Nesses casos, disponibilize o arquivo local ou importe os bytes para
`product_images` antes de repetir a migration. Não é feito download automático
de URLs externas. Os arquivos são necessários apenas para importações faltantes;
as imagens já persistidas não precisam de `storage`.

O `down(client)` da migration deve ser executado em uma transação, junto da
remoção do identificador `010-remove-product-image-columns` de `schema_migrations`.
Ele restaura ambas as colunas como `text NOT NULL`, sem default, com as constraints
originais de texto não vazio. Os valores passam a ser as URLs das rotas desktop e
mobile; não reconstrói os caminhos antigos literalmente e mantém os bytes em
`product_images`. Produtos sem upload também recebem essas URLs (o GET retorna 404).
Ao reaplicar o upgrade, será necessário completar imagens que estejam faltando.
O runner atual executa somente `up`; `down` é validado pelos testes de integração.

### Seeders e verificação de integração

`npm run db:seed` importa as imagens de exemplo junto com os produtos;
`npm run db:seed:product-images` completa imagens faltantes dos produtos de exemplo
já cadastrados. Ambos preservam uploads existentes. Os caminhos dos exemplos estão
em `src/database/product-seed-data.ts`, sem dependência das colunas removidas.

```sh
npm run typecheck
npm test
npm run build
TEST_DATABASE_URL=postgresql://usuario:senha@localhost:5432/banco_de_testes npm test
```

Os testes PostgreSQL criam e removem apenas schemas aleatórios próprios dentro do
banco de teste. Sem `TEST_DATABASE_URL`, essa suíte é ignorada. Ela cobre banco limpo,
upgrade, rollback, importação idempotente, falhas transacionais e CRUD com imagens.
O projeto não possui script ou configuração de lint; `npm run lint` não está disponível.
