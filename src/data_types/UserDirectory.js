import path from 'node:path';

import Directory from './Directory.js';

export default class UserDirectory extends Directory {
  getFilePath(fileName) {
    if (fileName.length < 8) {
      throw 'Filename is too short to derive dir path';
    }
    return path.join(this.getRootPath(), fileName.slice(0, 2),
                     fileName.slice(2, 4), fileName.slice(4, 6),
                     fileName.slice(6, 8), fileName);
  }
}
