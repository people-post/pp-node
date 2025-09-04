import Ajv from 'ajv';
import * as utils from 'brief-js-lib';

import UserFileAgent from './UserFileAgent.js';

function update(fastify, options, done) {
  const bodySchema = {
    body : {
      type : 'object',
      properties : {
        data : {type : 'string'},
        id : {type : 'string'},
        sig : {type : 'string'}
      },
      required : [ 'data', 'id', 'sig' ]
    }
  };

  const objSchema = {
    type : 'object',
    properties : {
      add_cids : {
        type : 'array',
        minItems : 1,
        maxItems : 100,
        items : {type : 'string'}
      }
    },
    required : [ 'add_cids' ]
  };

  const ajv = new Ajv();
  const objValidate = ajv.compile(objSchema);
  const aUserFile = new UserFileAgent();

  fastify.post('/update', {
    schema : bodySchema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.a.r.u),
    handler : async (req, res) => {
      if (!utils.verifySignature(req.body.data, req.g.user.publicKey,
                                 req.body.sig)) {
        return utils.makeDevErrorResponse(res, 'Failed to verify signature');
      }

      let d;
      try {
        d = JSON.parse(req.body.data);
      } catch (e) {
        return utils.makeDevErrorResponse(res, 'Invalid data format');
      }

      const valid = objValidate(d);
      if (!valid) {
        let msg = objValidate.errors.map(x => x.message).join(' ');
        return utils.makeDevErrorResponse(res, msg);
      }

      req.g.a.ipfs.pinCids(d.add_cids);

      aUserFile.attach(req.g.a.d.getOrInitUserDir(req.g.user.id));
      for (let cid of d.add_cids) {
        aUserFile.saveFile(cid, req.g.a.ipfs);
      }

      return utils.makeResponse(res, {});
    }
  });

  done();
}

function publish(fastify, options, done) {
  const schema = {
    body : {
      type : 'object',
      properties : {
        cid : {type : 'string'},
        id : {type : 'string'},
        sig : {type : 'string'}
      },
    }
  };

  fastify.post('/publish', {
    schema : schema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.a.r.u),
    handler : async (req, res) => {
      if (!utils.verifySignature(req.body.cid, req.g.user.publicKey,
                                 req.body.sig)) {
        return utils.makeDevErrorResponse(res, 'Failed to verify signature');
      }

      req.g.a.ipfs.publishName('self', req.body.cid);
      return utils.makeResponse(res, {});
    }
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(update);
  fastify.register(publish);
  done();
}

export {routes}
