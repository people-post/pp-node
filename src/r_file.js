import child_process from 'child_process';
import fs from "node:fs";
import os from 'node:os';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';

import * as utils from './utils.js';

function upload(fastify, opts, done) {
  fastify.post('/upload', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      const data = await req.file();
      const buff = await data.toBuffer();
      if (!utils.verifyUint8ArraySignature(new Uint8Array(buff),
                                           req.g.user.publicKey,
                                           data.fields.sig.value)) {
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

function routes(fastify, opts, done) {
  fastify.register(upload);
  done();
}

export {routes}
