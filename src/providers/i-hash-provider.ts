export interface IHashProvider {
  compare(plainText: string, hash: string): Promise<boolean>;
}
