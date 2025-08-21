import path from 'node:path';

import FileDirectory from './FileDirectory.js';

export default class VideoDirectory extends FileDirectory {
  getHlsManifestFilePath() {
    return path.join(this.getRootPath(), 'manifest.m3u8');
  }
  getWorkDirPath() { return path.join(this.getRootPath(), 'workspace'); }
}
