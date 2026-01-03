import Ajv from 'ajv';
import {FastifyInstance, FastifyPluginOptions} from 'fastify';
import * as utils from 'pp-js-lib';

import UserFileAgent from './UserFileAgent.js';

function addPin(fastify: FastifyInstance, _options: FastifyPluginOptions, done: () => void) {
  const bodySchema = {
    body : {
      type : 'object',
      properties : {data : {type : 'string'}, signature : {type : 'string'}},
      required : [ 'data', 'signature' ]
    }
  };

  const objSchema = {
    type : 'object',
    properties : {
      cids : {
        type : 'array',
        minItems : 1,
        maxItems : 100,
        items : {type : 'string'}
      }
    },
    required : [ 'cids' ]
  };

  const ajv = new Ajv();
  const objValidate = ajv.compile(objSchema);
  const aUserFile = new UserFileAgent();

  fastify.post('/add', {
    schema : bodySchema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g!.a.r.u),
    handler : async (req, res) => {
      if (!req.g || !req.g.user) {
        return res.status(500).send({error: 'Internal server error'});
      }
      const body = req.body as {data: string; signature: string};
      if (!utils.verifySignature(body.data, req.g.user.getPublicKey(), body.signature)) {
        return utils.makeDevErrorResponse(res, 'Failed to verify signature');
      }

      let d;
      try {
        d = JSON.parse(body.data);
      } catch (e) {
        return utils.makeDevErrorResponse(res, 'Invalid data format');
      }

      const valid = objValidate(d);
      if (!valid) {
        let msg = objValidate.errors?.map(x => x.message).join(' ') || 'Validation failed';
        return utils.makeDevErrorResponse(res, msg);
      }

      const pinData = d as {cids: string[]};
      req.g.a.ipfs.pinCids(pinData.cids);

      aUserFile.attach(req.g.a.d.getOrInitUserDir(req.g.user.getId()));
      for (let cid of pinData.cids) {
        aUserFile.saveFile(cid, req.g.a.ipfs);
      }

      return utils.makeResponse(res, {});
    }
  });

  done();
}

function publishPin(fastify: FastifyInstance, _options: FastifyPluginOptions, done: () => void) {
  const schema = {
    body : {
      type : 'object',
      properties : {cid : {type : 'string'}, signature : {type : 'string'}},
      required : [ 'cid', 'signature' ]
    }
  };

  fastify.post('/publish', {
    schema : schema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g!.a.r.u),
    handler : async (req, res) => {
      if (!req.g || !req.g.user) {
        return res.status(500).send({error: 'Internal server error'});
      }
      const body = req.body as {cid: string; signature: string};
      if (!utils.verifySignature(body.cid, req.g.user.getPublicKey(), body.signature)) {
        return utils.makeDevErrorResponse(res, 'Failed to verify signature');
      }

      req.g.user.setRootCid(body.cid);
      req.g.a.r.u.updateUser(req.g.user);
      req.g.publisher.publish();
      return utils.makeResponse(res, {});
    }
  });

  done();
}

function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void) {
  fastify.register(addPin);
  fastify.register(publishPin);
  done();
}

export {routes}

