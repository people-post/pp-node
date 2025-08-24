import path from 'node:path';

import Directory from './Directory.js';

export default class DataRootDirectory extends Directory {
  getUserDirPath(userId) {
    if (userId.length < 8) {
      throw 'Filename is too short to derive dir path';
    }
    return path.join(this.getRootPath(), userId.slice(0, 2), userId.slice(2, 4),
                     userId.slice(4, 6), userId.slice(6, 8), userId);
  }
}
