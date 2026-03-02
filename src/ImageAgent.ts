import fs from "node:fs";
import {pipeline} from 'node:stream/promises';
import sharp from 'sharp';
import {Readable} from 'node:stream';

import ImageDirectory from './data_types/ImageDirectory.js';
import IpfsAgent from './IpfsAgent.js';

interface ImageMeta {
  raw: string;
  default: string;
  thumbnails: Array<{x: number; y: number; cid: string}>;
}

export default class ImageAgent {
  #imgDir: ImageDirectory | null = null;

  attach(fileDirRoot: string): void { this.#imgDir = new ImageDirectory(fileDirRoot); }

  async save(file: Readable, ipfsAgent: IpfsAgent): Promise<{cid: string; meta: ImageMeta}> {
    if (!this.#imgDir) {
      throw new Error('ImageAgent not attached');
    }
    const meta: ImageMeta = {
      raw: '',
      default: '',
      thumbnails: []
    };

    // Raw file
    let filePath = this.#imgDir.getRawFilePath();
    await pipeline(file, fs.createWriteStream(filePath));
    meta.raw = await ipfsAgent.addFile(filePath);

    // Preprocess images
    const image = await sharp(this.#imgDir.getRawFilePath()).jpeg();
    const iMeta = await image.metadata();

    // Default file
    let x = 960;
    let y = 960;
    if (iMeta.width) x = Math.min(x, iMeta.width);
    if (iMeta.height) y = Math.min(y, iMeta.height);
    filePath = this.#imgDir.getDefaultFilePath('jpg');
    await image.resize(x, y).toFile(filePath);
    meta.default = await ipfsAgent.addFile(filePath);

    // Thumbnails
    const sizes: [number, number][] = [ [ 480, 480 ], [ 240, 240 ] ];
    for (const [sizeX, sizeY] of sizes) {
      let thumbX = sizeX;
      let thumbY = sizeY;
      if (iMeta.width && iMeta.width < thumbX && iMeta.height && iMeta.height < thumbY) {
        continue;
      }
      if (iMeta.width) thumbX = Math.min(thumbX, iMeta.width);
      if (iMeta.height) thumbY = Math.min(thumbY, iMeta.height);
      filePath = this.#imgDir.getThumbnailFilePath(thumbX, thumbY, 'jpg');
      await image.resize(thumbX, thumbY).toFile(filePath);
      let cid = await ipfsAgent.addFile(filePath);
      meta.thumbnails.push({x : thumbX, y : thumbY, cid : cid});
    }

    // Write meta
    filePath = this.#imgDir.getIndexFilePath();
    fs.writeFileSync(filePath, JSON.stringify(meta));

    // cid: Meta file cid
    // meta: Meta file relates to all files
    return {cid : await ipfsAgent.addFile(filePath), meta : meta};
  }
}

