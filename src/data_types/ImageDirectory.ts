import path from 'node:path';

import FileDirectory from './FileDirectory.js';

export default class ImageDirectory extends FileDirectory {
  #base: string = 'image';

  getDefaultFilePath(extension: string): string {
    return path.join(this.getRootPath(), `${this.#base}.${extension}`);
  }
  getThumbnailFilePath(sizeX: number, sizeY: number, extension: string): string {
    return path.join(this.getRootPath(),
                     `${this.#base}_${sizeX}x${sizeY}.${extension}`);
  }
}

