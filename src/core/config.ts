function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`A variável de ambiente ${name} é obrigatória.`);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3000);

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('A variável API_PORT deve conter uma porta válida.');
  }

  return port;
}

export const databaseUrl = requiredEnvironmentVariable('DATABASE_URL');
export const apiPort = parsePort(process.env.API_PORT);
