import path from 'node:path';

import Directory from './Directory.js';

export default class VideoWorkDirectory extends Directory {
  getStdoutFilePath() { return path.join(this.getRootPath(), 'stdout.txt'); }
  getStderrFilePath() { return path.join(this.getRootPath(), 'stderr.txt'); }
  getConfigFilePath() { return path.join(this.getRootPath(), 'config.json'); }
  getStatusFilePath() { return path.join(this.getRootPath(), 'status.json'); }
}
