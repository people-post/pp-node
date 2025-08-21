import child_process from 'child_process';
import fs from "node:fs";
import {pipeline} from 'node:stream/promises';
import sharp from 'sharp';

import ImageDirectory from './data_types/ImageDirectory.js';

export default class ImageAgent {
  #fileDir;

  attach(fileDirRoot) { this.#fileDir = new ImageDirectory(fileDirRoot); }

  async save(file) {
    const meta = {};
    const cids = [];

    // Raw file
    let filePath = this.#fileDir.getRawFilePath();
    await pipeline(file, fs.createWriteStream(filePath));
    meta.raw = this.#ipfsAddFile(filePath);
    cids.push(meta.raw);

    // Preprocess images
    const image = await sharp(this.#fileDir.getRawFilePath());
    const iMeta = await image.metadata();

    // Default file
    let x = 960;
    let y = 960;
    x = Math.min(x, iMeta.width);
    y = Math.min(y, iMeta.height);
    filePath = this.#fileDir.getDefaultFilePath();
    await image.resize(x, y).toFile(filePath);
    meta.default = this.#ipfsAddFile(filePath);
    cids.push(meta.default);

    // Thumbnails
    meta.thumbnails = [];
    const sizes = [ [ 480, 480 ], [ 240, 240 ] ];
    for ([ x, y ] of sizes) {
      if (iMeta.width < x && iMeta.height < y) {
        continue;
      }
      x = Math.min(x, iMeta.width);
      y = Math.min(y, iMeta.height);
      filePath = this.#fileDir.getThumbnailFilePath(x, y);
      await image.resize(x, y).toFile(filePath);
      let cid = this.#ipfsAddFile(filePath);
      meta.thumbnails.push({x : x, y : y, cid : cid});
      cids.push(cid);
    }

    // Write meta
    filePath = this.#fileDir.getIndexFilePath();
    fs.writeFileSync(filePath, JSON.stringify(meta));

    // cid: Meta file cid
    // meta: Meta file relates to all files
    // cids: All other file cids
    return {cid : this.#ipfsAddFile(filePath), meta : meta, cids : cids};
  }

  #ipfsAddFile(filePath) {
    let cmd = 'ipfs add --pin=false ' + filePath;
    let stdout = child_process.execSync(cmd);
    // stdout: Added <cid> name
    let cid = stdout.toString().split(" ")[1];
    return cid.toString();
  }
}
