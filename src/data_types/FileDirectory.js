import path from 'node:path';

import Directory from './Directory.js';

export default class FileDirectory extends Directory {
  getIndexFilePath() { return path.join(this.getRootPath(), 'index.json'); };
  getRawFilePath() { return path.join(this.getRootPath(), 'raw'); }
  getCoverImageRawFilePath() {
    return path.join(this.getRootPath(), 'cover_raw');
  }
  getCoverImageFilePath() { return path.join(this.getRootPath(), 'cover'); }
}
