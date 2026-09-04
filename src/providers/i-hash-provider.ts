export interface IHashGenerator {
  hash(plainText: string): Promise<string>;
}

export interface IHashComparer {
  compare(plainText: string, hash: string): Promise<boolean>;
}

export interface IHashProvider extends IHashGenerator, IHashComparer {}
