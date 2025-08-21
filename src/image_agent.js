import child_process from 'child_process';
import fs from "node:fs";
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import sharp from 'sharp';

class Directory {
  #rootDir;
  constructor(rootDir) { this.#rootDir = rootDir; }

  getRootPath() { return this.#rootDir; }
}

class FileDirectory extends Directory {
  getIndexFilePath() { return path.join(this.getRootPath(), 'index.json'); };
  getRawFilePath() { return path.join(this.getRootPath(), 'raw'); }
  getCoverImageRawFilePath() {
    return path.join(this.getRootPath(), 'cover_raw');
  }
  getCoverImageFilePath() { return path.join(this.getRootPath(), 'cover'); }
}

class ImageDirectory extends FileDirectory {
  getDefaultFilePath() { return path.join(this.getRootPath(), 'image'); }
  getThumbnailFilePath(sizeX, sizeY) {
    let base = this.getDefaultFilePath();
    return `${base}_${sizeX}x${sizeY}`;
  }
}

class VideoDirectory extends FileDirectory {
  getHlsManifestFilePath() {
    return path.join(this.getRootPath(), 'manifest.m3u8');
  }
  getWorkDirPath() { return path.join(this.getRootPath(), 'workspace'); }
}

class VideoWorkDirectory extends Directory {
  getStdoutFilePath() { return path.join(this.getRootPath(), 'stdout.txt'); }
  getStderrFilePath() { return path.join(this.getRootPath(), 'stderr.txt'); }
  getConfigFilePath() { return path.join(this.getRootPath(), 'config.json'); }
  getStatusFilePath() { return path.join(this.getRootPath(), 'status.json'); }
}

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
