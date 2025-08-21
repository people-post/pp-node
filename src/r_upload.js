import * as utils from 'brief-js-lib';
import child_process from 'child_process';
import fs from "node:fs";
import os from 'node:os';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import sharp from 'sharp';

class Directory {
  #rootDir;
  constructor(rootDir) { this.#rootDir = rootDir; }

  getRootPath() { return this.#rootDir; }
}

class FileDirectory extends Directory {
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

function file(fastify, opts, done) {
  fastify.post('/file', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      const data = await req.file();
      const buff = await data.toBuffer();
      const sig = data.fields.sig.value;
      if (!utils.verifyUint8ArraySignature(new Uint8Array(buff),
                                           req.g.user.publicKey, sig)) {
        return utils.makeErrorResponse(res, 'sig not verified');
      }

      let dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      let filePath = path.join(dirPath, "dummy");
      await pipeline(data.file, fs.createWriteStream(filePath));
      const cmd = 'ipfs add --pin=false ' + filePath;
      const stdout = child_process.execSync(cmd);
      // stdout: Added <cid> name
      const cid = stdout.toString().split(" ")[1];
      return utils.makeResponse(res, {cid : cid.toString()});
    }
  });

  done();
}

function image(fastify, opts, done) {
  fastify.post('/image', {
    // preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      const data = await req.file();
      // const buff = await data.toBuffer(); // !!toBuffer will consume file
      const sig = data.fields.sig.value;
      // if (!utils.verifyUint8ArraySignature(new Uint8Array(buff),
      // req.g.user.publicKey, sig)) {
      // return
      // utils.makeErrorResponse(res,
      // 'sig not verified');
      //}

      const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      const dir = new ImageDirectory(dirPath);
      await pipeline(data.file, fs.createWriteStream(dir.getRawFilePath()));
      console.log(dirPath);

      // Preprocess images
      const image = await sharp(dir.getRawFilePath());
      const meta = await image.metadata();

      let x = 960;
      let y = 960;
      x = Math.min(x, meta.width);
      y = Math.min(y, meta.height);
      await image.resize(x, y).toFile(dir.getDefaultFilePath());

      const sizes = [ [ 480, 480 ], [ 240, 240 ] ];
      for ([ x, y ] of sizes) {
        if (meta.width < x && meta.height < y) {
          continue;
        }
        x = Math.min(x, meta.width);
        y = Math.min(y, meta.height);
        await image.resize(x, y).toFile(dir.getThumbnailFilePath(x, y));
      }

      let cmd = 'ipfs add --pin=false ' + dir.getRootPath();
      let stdout = child_process.execSync(cmd);
      // stdout: Added <cid> name
      let cid = stdout.toString().split(" ")[1];

      // Write meta
      const fileMeta = {'cid' : cid.toString(), 'sizes' : []};
      fs.writeFileSync(metaFilePath, JSON.stringify(fileMeta));
      cmd = 'ipfs add --pin=false ' + metaFilePath;
      stdout = child_process.execSync(cmd);
      cid = stdout.toString().split(" ")[1];

      return utils.makeResponse(res, {cid : cid.toString()});
    }
  });

  done();
}

function video(fastify, opts, done) {
  fastify.post('/video', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      const data = await req.file();
      const buff = await data.toBuffer();
      const sig = data.fields.sig.value;
      if (!utils.verifyUint8ArraySignature(new Uint8Array(buff),
                                           req.g.user.publicKey, sig)) {
        return utils.makeErrorResponse(res, 'sig not verified');
      }
    }
  });
  done();
}

function json(fastify, opts, done) {
  const schema = {
    body : {
      type : 'object',
      properties : {
        data : {type : 'string'},
        id : {type : 'string'},
        sig : {type : 'string'}
      }
    }
  };

  fastify.post('/json', {
    schema : schema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      if (!utils.verifySignature(req.body.data, req.g.user.publicKey,
                                 req.body.sig)) {
        return utils.makeErrorResponse(res, 'sig not verified');
      }

      let dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      let filePath = path.join(dirPath, "dummy");
      fs.writeFileSync(filePath, req.body.data);
      const cmd = 'ipfs add --pin=false ' + filePath;
      const stdout = child_process.execSync(cmd);
      // stdout: Added <cid> name
      const cid = stdout.toString().split(" ")[1];
      return utils.makeResponse(res, {cid : cid});
    }
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(file);
  fastify.register(image);
  fastify.register(video);
  fastify.register(json);
  done();
}

export {routes}
