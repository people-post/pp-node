export default class Directory {
  #rootDir;
  constructor(rootDir) { this.#rootDir = rootDir; }

  getRootPath() { return this.#rootDir; }
}
