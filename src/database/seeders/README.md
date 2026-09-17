# Seeders

Execute `npm run db:migrate` e depois `npm run db:seed`.
No Docker: `docker compose exec api npm run db:seed`.

O comando descobre automaticamente os arquivos `*-seeder.ts` desta pasta e
executa um por vez, em ordem numerica. Use nomes como `008-novo-seeder.ts`,
com um numero posterior aos seeders dos quais o novo arquivo depende.
Nao e necessario alterar o package.json ao adicionar arquivos.

Cada seeder deve encerrar suas conexoes e retornar codigo de saida diferente
de zero em caso de falha. O comando interrompe a execucao quando um seeder falha.
As migrations devem estar aplicadas antes da execucao.

Novos seeders devem suportar repeticao usando chaves estaveis e
`ON CONFLICT` ou verificando registros existentes. A descoberta automatica
nao corrige SQL invalido nem dependencias ausentes.
Os seeders atuais atualizam dados de exemplo existentes; o de usuarios tambem
redefine as senhas de teste. O de pedidos preserva pedidos do mesmo usuario
e data de exemplo, sem recria-los.

Os seeders 004, 005 e 006 importam os bytes das imagens junto com seus produtos,
na mesma transacao. Arquivos ausentes causam rollback de todo o respectivo seeder.
Os dados e caminhos locais estao em `../product-seed-data.ts`; os caminhos nao
sao persistidos em `products`. Registros existentes em `product_images` sao
preservados, inclusive uploads. O seeder 008 completa somente imagens faltantes
dos produtos de exemplo ja cadastrados, sem depender das antigas colunas.
