import child_process from 'child_process';

import * as utils from './utils.js';

function update(fastify, options, done) {
  const schema = {
    body : {
      type : 'object',
      properties : {
        data : {type : 'string'},
        id : {type : 'string'},
        sig : {type : 'string'}
      },
    }
  };

  fastify.post('/update', {
    schema : schema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      if (!utils.verifySignature(req.body.data, req.g.user.publicKey,
                                 req.body.sig)) {
        return utils.makeErrorResponse(res, "sig not verified");
      }

      let cmd;
      const d = JSON.parse(req.body.data);
      let removed = "";
      let added = "";
      if (Object.prototype.toString.call(d) === '[object Object]') {
        if (Object.hasOwn(d, "rm_cids"))
          if (Array.isArray(d.rm_cids))
            if (d.rm_cids.length) {
              removed = d.rm_cids.join(' ');
              cmd = 'ipfs pin rm ' + removed;
              try {
                child_process.execSync(cmd);
              } catch (e) {
                // Don't care remove error
              }
            }
        if (Object.hasOwn(d, "add_cids"))
          if (Array.isArray(d.add_cids))
            if (d.add_cids.length) {
              added = d.add_cids.join(' ')
              cmd = 'ipfs pin add ' + added;
              child_process.execSync(cmd);
            }
      }

      return utils.makeResponse(res, {removed : removed, added : added});
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
