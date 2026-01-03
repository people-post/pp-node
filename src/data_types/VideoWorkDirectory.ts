import path from 'node:path';

import Directory from './Directory.js';

export default class VideoWorkDirectory extends Directory {
  getStdoutFilePath(): string { return path.join(this.getRootPath(), 'stdout.txt'); }
  getStderrFilePath(): string { return path.join(this.getRootPath(), 'stderr.txt'); }
  getConfigFilePath(): string { return path.join(this.getRootPath(), 'config.json'); }
  getStatusFilePath(): string { return path.join(this.getRootPath(), 'status.json'); }
}

