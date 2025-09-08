import * as utils from 'brief-js-lib';
import fs from "node:fs";
import os from 'node:os';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';

import ImageAgent from './ImageAgent.js';

function token(fastify, opts, done) {
  fastify.get('/token', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.a.r.u),
    handler : async (req, res) => {
      const token = req.g.a.r.t.initFor(req.g.user.id);
      return utils.makeResponse(res, {token : token});
    }
  });

  done();
}

function file(fastify, opts, done) {
  fastify.post('/file', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.a.r.u),
    handler : async (req, res) => {
      const data = await req.file();
      const token = data.fields.token.value;
      const signature = data.fields.signature.value;

      if (!utils.verifySignature(token, req.g.user.publicKey, signature)) {
        return utils.makeDevErrorResponse(res, 'Failed to verify signature');
      }

      let dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      let filePath = path.join(dirPath, "dummy");
      await pipeline(data.file, fs.createWriteStream(filePath));
      const cid = req.g.r.ipfs.addFile(filePath);
      return utils.makeResponse(res, {cid : cid.toString()});
    }
  });

  done();
}

function image(fastify, opts, done) {
  const agent = new ImageAgent();

  fastify.post('/image', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.a.r.u),
    handler : async (req, res) => {
      const data = await req.file();
      const token = data.fields.token.value;
      const signature = data.fields.signature.value;

      if (!utils.verifySignature(token, req.g.user.publicKey, signature)) {
        return utils.makeDevErrorResponse(res, 'Failed to verify signature');
      }

      const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      agent.attach(dirPath);
      let d = await agent.save(data.file, req.g.a.ipfs);

      return utils.makeResponse(res, d);
    }
  });

  done();
}

function video(fastify, opts, done) {
  fastify.post('/video', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.a.r.u),
    handler : async (req, res) => {
      const data = await req.file();
      const token = data.fields.token.value;
      const signature = data.fields.signature.value;
      if (!utils.verifySignature(token, req.g.user.publicKey, signature)) {
        return utils.makeDevErrorResponse(res, 'Faield to verify signature');
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
        signature : {type : 'string'}
      }
    }
  };

  fastify.post('/json', {
    schema : schema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.a.r.u),
    handler : async (req, res) => {
      if (!utils.verifySignature(req.body.data, req.g.user.publicKey,
                                 req.body.signature)) {
        return utils.makeDevErrorResponse(res, 'signature not verified');
      }

      let dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      let filePath = path.join(dirPath, "dummy");
      fs.writeFileSync(filePath, req.body.data);
      const cid = req.g.r.ipfs.addFile(filePath);
      return utils.makeResponse(res, {cid : cid});
    }
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(token);
  fastify.register(file);
  fastify.register(image);
  fastify.register(video);
  fastify.register(json);
  done();
}

export {routes}
