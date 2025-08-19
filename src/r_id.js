import * as utils from 'brief-js-lib';

function register(fastify, options, done) {
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

    if (!req.g.db.hasQuota('register')) {
      if (req.body.key) {
        // Using api key
        if (req.body.key != req.g.config.api_key) {
          return utils.makeErrorResponse(res, 'Key error');
        }
      } else {
        return utils.makeErrorResponse(res, 'Quota limit');
      }
    }

    if (req.g.db.getUser(req.body.id)) {
      return utils.makeErrorResponse(res, "Id already registered");
    }

    if (!utils.verifySignature(req.body.cid, req.body.public_key,
                               req.body.signature)) {
      return utils.makeErrorResponse(res, 'Invalid signature');
    }

    req.g.db.addQuotaItem('register');
    req.g.db.addUser(req.body.id, req.body.public_key);
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(register);
  done();
}

export {routes}
