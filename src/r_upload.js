import * as utils from 'brief-js-lib';
import child_process from 'child_process';
import fs from "node:fs";
import os from 'node:os';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';

import ImageAgent from './ImageAgent.js';

function file(fastify, opts, done) {
  fastify.post('/file', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      const data = await req.file();
      const hash = data.fields.hash.value;
      const sig = data.fields.sig.value;

      let dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      let filePath = path.join(dirPath, "dummy");
      await pipeline(data.file, fs.createWriteStream(filePath));

      if (hash != await utils.hashFile(filePath)) {
        return utils.makeErrorResponse(res, 'Failed to verify hash');
      }

      if (!utils.verifySignature(hash, req.g.user.publicKey, sig)) {
        return utils.makeErrorResponse(res, 'Failed to verify signature');
      }

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
  const agent = new ImageAgent();

  fastify.post('/image', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      const data = await req.file();
      const hash = data.fields.hash.value;
      const sig = data.fields.sig.value;

      const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      agent.attach(dirPath);
      let d = await agent.save(data.file);

      // TODO: get filePath
      if (hash != await utils.hashFile(filePath)) {
        return utils.makeErrorResponse(res, 'Failed to verify hash');
      }

      if (!utils.verifySignature(hash, req.g.user.publicKey, sig)) {
        return utils.makeErrorResponse(res, 'Failed to verify signature');
      }

      return utils.makeResponse(res, d);
    }
  });

  done();
}

function video(fastify, opts, done) {
  fastify.post('/video', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      const data = await req.file();
      const hash = data.fields.hash.value;
      const sig = data.fields.sig.value;
      // TODO: Verify hash
      if (!utils.verifySignature(hash, req.g.user.publicKey, sig)) {
        return utils.makeErrorResponse(res, 'Faield to verify signature');
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
