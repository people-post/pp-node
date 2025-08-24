import fs from 'node:fs';
import path from 'node:path';

import DataRootDirectory from './data_types/DataRootDirectory.js';

export default class DataRootDirAgent {
  #rootDir;

  init(config) {
    // Fields in config:
    // root:
    // data_dir:
    let dirPath = 'data';
    if (config.data_dir && config.data_dir.length) {
      dirPath = config.data_dir;
    }
    if (!path.isAbsolute(dirPath)) {
      dirPath = path.join(config.root, dirPath);
    }
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, {recursive : true});
    }
    this.#attach(dirPath);
  }

  getOrInitUserDir(userId) {
    let dirPath = this.#rootDir.getUserDirPath(userId);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, {recursive : true});
    }
    return dirPath;
  }

  #attach(dirRoot) { this.#rootDir = new DataRootDirectory(dirRoot); }
}
