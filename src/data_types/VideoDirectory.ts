import path from 'node:path';

import FileDirectory from './FileDirectory.js';

export default class VideoDirectory extends FileDirectory {
  getHlsManifestFilePath(): string {
    return path.join(this.getRootPath(), 'manifest.m3u8');
  }
  getWorkDirPath(): string { return path.join(this.getRootPath(), 'workspace'); }
}

