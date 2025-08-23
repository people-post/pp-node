import child_process from 'child_process';
import fs from 'node:fs';
import path from 'node:path';

import UserDirectory from './data_types/UserDirectory.js';

export default class UserFileAgent {
  #userDir;
  attach(userDirRoot) { this.#userDir = new UserDirectory(userDirRoot); }

  saveFile(cid) {
    let filePath = this.#userDir.getFilePath(cid);
    const dirPath = path.dirname(filePath);
    fs.mkdirSync(dirPath, {recursive : true});
    let cmd = 'ipfs get --output=' + filePath + ' ' + cid;
    child_process.execSync(cmd);
  }
}
