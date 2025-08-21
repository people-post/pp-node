import path from 'node:path';

import FileDirectory from './FileDirectory.js';

export default class ImageDirectory extends FileDirectory {
  getDefaultFilePath() { return path.join(this.getRootPath(), 'image'); }
  getThumbnailFilePath(sizeX, sizeY) {
    let base = this.getDefaultFilePath();
    return `${base}_${sizeX}x${sizeY}`;
  }
}
