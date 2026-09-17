import { fileURLToPath } from 'node:url';

import { runSeeders } from './seeder-runner.js';

runSeeders(fileURLToPath(new URL('./seeders/', import.meta.url))).catch((error: unknown) => {
  console.error('Falha ao executar seeders.', error);
  process.exitCode = 1;
});
