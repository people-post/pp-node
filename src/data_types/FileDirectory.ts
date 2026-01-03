import path from 'node:path';

import Directory from './Directory.js';

export default class FileDirectory extends Directory {
  getIndexFilePath(): string { return path.join(this.getRootPath(), 'index.json'); };
  getRawFilePath(): string { return path.join(this.getRootPath(), 'raw'); }
  getCoverImageRawFilePath(): string {
    return path.join(this.getRootPath(), 'cover_raw');
  }
  getCoverImageFilePath(): string { return path.join(this.getRootPath(), 'cover'); }
}

