import Ajv from 'ajv';
import * as utils from 'brief-js-lib';
import child_process from 'child_process';

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
    type : "object",
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
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      if (!utils.verifySignature(req.body.data, req.g.user.publicKey,
                                 req.body.sig)) {
        return utils.makeErrorResponse(res, "sig not verified");
      }

      let d;
      try {
        d = JSON.parse(req.body.data);
      } catch (e) {
        return utils.makeErrorResponse(res, "Invalid data format");
      }

      const valid = objValidate(d);
      if (!valid) {
        let msg = objValidate.errors.map(x => x.message).join(' ');
        return utils.makeErrorResponse(res, msg);
      }

      const cids = d.add_cids.join(' ')
      const cmd = 'ipfs pin add ' + cids;
      child_process.execSync(cmd);

      aUserFile.attach(req.g.aDataRoot.getOrInitUserDir(req.g.user.id));
      for (let cid of d.add_cids) {
        aUserFile.saveFile(cid);
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
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      if (!utils.verifySignature(req.body.cid, req.g.user.publicKey,
                                 req.body.sig)) {
        return utils.makeErrorResponse(res, 'sig not verified');
      }

      const cmd = 'ipfs name publish ' + req.body.cid;
      child_process.execSync(cmd);
      return utils.makeResponse(res, {published : req.body.cid});
    }
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(publish);
  fastify.register(update);
  done();
}

export {routes}
