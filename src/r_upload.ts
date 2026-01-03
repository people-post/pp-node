import fs from "node:fs";
import os from 'node:os';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {FastifyInstance, FastifyPluginOptions} from 'fastify';
import * as utils from 'pp-js-lib';

import ImageAgent from './ImageAgent.js';

function token(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void) {
  fastify.get('/token', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g!.a.r.u),
    handler : async (req, res) => {
      if (!req.g || !req.g.user) {
        return res.status(500).send({error: 'Internal server error'});
      }
      const token = req.g.a.r.t.initFor(req.g.user.getId());
      return utils.makeResponse(res, {token : token});
    }
  });

  done();
}

function file(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void) {
  fastify.post('/file', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g!.a.r.u),
    handler : async (req, res) => {
      if (!req.g || !req.g.user) {
        return res.status(500).send({error: 'Internal server error'});
      }
      const data = await req.file();
      if (!data) {
        return utils.makeDevErrorResponse(res, 'No file uploaded');
      }
      const token = (data.fields.token as {value: string}).value;
      const signature = (data.fields.signature as {value: string}).value;

      if (!utils.verifySignature(token, req.g.user.getPublicKey(), signature)) {
        return utils.makeDevErrorResponse(res, 'Failed to verify signature');
      }

      let dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      let filePath = path.join(dirPath, "dummy");
      await pipeline(data.file, fs.createWriteStream(filePath));
      const cid = req.g!.a.ipfs.addFile(filePath);
      return utils.makeResponse(res, {cid : cid.toString()});
    }
  });

  done();
}

function image(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void) {
  const agent = new ImageAgent();

  fastify.post('/image', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g!.a.r.u),
    handler : async (req, res) => {
      if (!req.g || !req.g.user) {
        return res.status(500).send({error: 'Internal server error'});
      }
      const data = await req.file();
      if (!data) {
        return utils.makeDevErrorResponse(res, 'No file uploaded');
      }
      const token = (data.fields.token as {value: string}).value;
      const signature = (data.fields.signature as {value: string}).value;

      if (!utils.verifySignature(token, req.g.user.getPublicKey(), signature)) {
        return utils.makeDevErrorResponse(res, 'Failed to verify signature');
      }

      const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      agent.attach(dirPath);
      let d = await agent.save(data.file, req.g!.a.ipfs);

      return utils.makeResponse(res, d);
    }
  });

  done();
}

function video(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void) {
  fastify.post('/video', {
    preHandler : async (req, res) => utils.authCheck(req, res, req.g!.a.r.u),
    handler : async (req, res) => {
      if (!req.g || !req.g.user) {
        return res.status(500).send({error: 'Internal server error'});
      }
      const data = await req.file();
      if (!data) {
        return utils.makeDevErrorResponse(res, 'No file uploaded');
      }
      const token = (data.fields.token as {value: string}).value;
      const signature = (data.fields.signature as {value: string}).value;
      if (!utils.verifySignature(token, req.g.user.getPublicKey(), signature)) {
        return utils.makeDevErrorResponse(res, 'Failed to verify signature');
      }
      return utils.makeResponse(res, {});
    }
  });

  done();
}

function json(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void) {
  const schema = {
    body : {
      type : 'object',
      properties : {data : {type : 'string'}, signature : {type : 'string'}},
      required : [ 'data', 'signature' ]
    }
  };

  fastify.post('/json', {
    schema : schema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g!.a.r.u),
    handler : async (req, res) => {
      if (!req.g || !req.g.user) {
        return res.status(500).send({error: 'Internal server error'});
      }
      const body = req.body as {data: string; signature: string};
      if (!utils.verifySignature(body.data, req.g.user.getPublicKey(), body.signature)) {
        return utils.makeDevErrorResponse(res, 'signature not verified');
      }

      let dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      let filePath = path.join(dirPath, "dummy");
      fs.writeFileSync(filePath, body.data);
      const cid = req.g.a.ipfs.addFile(filePath);
      return utils.makeResponse(res, {cid : cid});
    }
  });

  done();
}

function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void) {
  fastify.register(token);
  fastify.register(file);
  fastify.register(image);
  fastify.register(video);
  fastify.register(json);
  done();
}

export {routes}

