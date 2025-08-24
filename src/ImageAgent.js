import fs from "node:fs";
import {pipeline} from 'node:stream/promises';
import sharp from 'sharp';

import ImageDirectory from './data_types/ImageDirectory.js';

export default class ImageAgent {
  #imgDir;

  attach(fileDirRoot) { this.#imgDir = new ImageDirectory(fileDirRoot); }

  async save(file, ipfsAgent) {
    const meta = {};

    // Raw file
    let filePath = this.#imgDir.getRawFilePath();
    await pipeline(file, fs.createWriteStream(filePath));
    meta.raw = ipfsAgent.addFile(filePath);

    // Preprocess images
    const image = await sharp(this.#imgDir.getRawFilePath()).jpeg();
    const iMeta = await image.metadata();

    // Default file
    let x = 960;
    let y = 960;
    x = Math.min(x, iMeta.width);
    y = Math.min(y, iMeta.height);
    filePath = this.#imgDir.getDefaultFilePath('jpg');
    await image.resize(x, y).toFile(filePath);
    meta.default = ipfsAgent.addFile(filePath);

    // Thumbnails
    meta.thumbnails = [];
    const sizes = [ [ 480, 480 ], [ 240, 240 ] ];
    for ([ x, y ] of sizes) {
      if (iMeta.width < x && iMeta.height < y) {
        continue;
      }
      x = Math.min(x, iMeta.width);
      y = Math.min(y, iMeta.height);
      filePath = this.#imgDir.getThumbnailFilePath(x, y, 'jpg');
      await image.resize(x, y).toFile(filePath);
      let cid = ipfsAgent.addFile(filePath);
      meta.thumbnails.push({x : x, y : y, cid : cid});
    }

    // Write meta
    filePath = this.#imgDir.getIndexFilePath();
    fs.writeFileSync(filePath, JSON.stringify(meta));

    // cid: Meta file cid
    // meta: Meta file relates to all files
    return {cid : ipfsAgent.addFile(filePath), meta : meta};
  }
}
