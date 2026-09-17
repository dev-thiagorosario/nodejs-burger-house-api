import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

function executeSeeder(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', path], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Seeder ${path} falhou (${signal ?? code}).`));
      }
    });
  });
}

export async function runSeeders(
  directory: string,
  execute: (path: string) => Promise<void> = executeSeeder,
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('-seeder.ts'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  for (const file of files) {
    console.log(`Executando seeder: ${file}`);
    await execute(join(directory, file));
  }
}
