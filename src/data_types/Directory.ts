export default class Directory {
  #rootDir: string;
  constructor(rootDir: string) { this.#rootDir = rootDir; }

  getRootPath(): string { return this.#rootDir; }
}

