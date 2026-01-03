import fs from 'node:fs';
import path from 'node:path';

import UserDirectory from './data_types/UserDirectory.js';
import IpfsAgent from './IpfsAgent.js';

export default class UserFileAgent {
  #userDir: UserDirectory | null = null;
  attach(userDirRoot: string): void { this.#userDir = new UserDirectory(userDirRoot); }

  saveFile(cid: string, ipfsAgent: IpfsAgent): void {
    if (!this.#userDir) {
      throw new Error('UserFileAgent not attached');
    }
    let filePath = this.#userDir.getFilePath(cid);
    const dirPath = path.dirname(filePath);
    fs.mkdirSync(dirPath, {recursive : true});
    ipfsAgent.fetchFile(cid, filePath);
  }
}

