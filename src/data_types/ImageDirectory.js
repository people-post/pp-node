import path from 'node:path';

import FileDirectory from './FileDirectory.js';

export default class ImageDirectory extends FileDirectory {
  #base = 'image';

  getDefaultFilePath(extension) {
    return path.join(this.getRootPath(), `${this.#base}.${extension}`);
  }
  getThumbnailFilePath(sizeX, sizeY, extension) {
    return path.join(this.getRootPath(),
                     `${this.#base}_${sizeX}x${sizeY}.${extension}`);
  }
}
