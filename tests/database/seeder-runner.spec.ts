import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { runSeeders } from '../../src/database/seeder-runner.js';

const directories: string[] = [];

async function fixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'seeders-test-'));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe('runSeeders', () => {
  it('discovers new seeders, ignores other files and awaits numeric execution order', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const directory = await fixture();
    for (const name of ['010-orders-seeder.ts', '002-products-seeder.ts', 'README.md']) {
      await writeFile(join(directory, name), '');
    }
    await mkdir(join(directory, '003-directory-seeder.ts'));
    const completed: string[] = [];
    await runSeeders(directory, async (path) => {
      if (basename(path) === '010-orders-seeder.ts') {
        expect(completed).toEqual(['002-products-seeder.ts']);
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
      completed.push(basename(path));
    });
    expect(completed).toEqual(['002-products-seeder.ts', '010-orders-seeder.ts']);
    await writeFile(join(directory, '011-new-seeder.ts'), '');
    const execute = vi.fn(async () => {});
    await runSeeders(directory, execute);
    expect(execute).toHaveBeenLastCalledWith(join(directory, '011-new-seeder.ts'));
  });

  it('stops and reports failure before executing dependent seeders', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const directory = await fixture();
    await writeFile(join(directory, '001-user-seeder.ts'), '');
    await writeFile(join(directory, '002-orders-seeder.ts'), '');
    const execute = vi.fn().mockRejectedValue(new Error('Database unavailable'));
    await expect(runSeeders(directory, execute)).rejects.toThrow('Database unavailable');
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
