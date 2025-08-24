import * as utils from 'brief-js-lib';

function listUsers(fastify, options, done) {
  fastify.get('/list', {
    handler : async (req, res) => {
      const users = req.g.a.r.u.getAll();
      return utils.makeResponse(res, {users : users});
    }
  });

  done();
}

function registerUser(fastify, options, done) {
  const schema = {
    body : {
      type : 'object',
      properties : {
        id : {type : 'string'},
        key : {type : 'string'},
        public_key : {type : 'string'},
        signature : {type : 'string'}
      },
      required : [ 'id', 'public_key', 'signature' ]
    }
  };

  fastify.post('/register', {schema}, async (req, res) => {
    // TODO: Use payment to prevent naming being occupied without cost.

    if (!req.g.a.r.u.hasQuota('register')) {
      if (req.body.key) {
        // Using api key
        if (req.body.key != req.g.config.api_key) {
          return utils.makeErrorResponse(res, 'Key error');
        }
      } else {
        return utils.makeErrorResponse(res, 'Quota limit');
      }
    }

    if (req.g.a.r.u.getUser(req.body.id)) {
      return utils.makeErrorResponse(res, "Id already registered");
    }

    if (!utils.verifySignature(req.body.cid, req.body.public_key,
                               req.body.signature)) {
      return utils.makeErrorResponse(res, 'Invalid signature');
    }

    req.g.a.r.u.addQuotaItem('register');
    req.g.a.r.u.addUser(req.body.id, req.body.public_key);
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(listUsers);
  fastify.register(registerUser);
  done();
}

export {routes}
