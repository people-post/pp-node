import * as utils from 'pp-js-lib';

function getUser(fastify, options, done) {
  const schema = {
    query : {
      type : 'object',
      properties : {id : {type : 'string'}},
      required : [ 'id' ]
    }
  };

  fastify.get('/get', {
    schema : schema,
    handler : async (req, res) => {
      const user = req.g.a.r.u.getUser(req.query.id);
      return utils.makeResponse(res, {user : user});
    }
  });

  done();
}

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
        name : {type : 'string'},
        public_key : {type : 'string'},
        signature : {type : 'string'},
        peer_key : {type : 'string'}
      },
      required : [ 'id', 'name', 'public_key', 'signature' ]
    }
  };

  fastify.post('/register', {
    schema : schema,
    handler : async (req, res) => {
      if (!req.g.config.enable_register) {
        return utils.makeDevErrorResponse(res, 'Registration disabled');
      }

      if (!req.g.a.r.u.hasQuota('register')) {
        return utils.makeLimitationResponse(res, 'E_LIMIT_REACHED');
      }

      if (req.g.a.r.u.getUser(req.body.id)) {
        return utils.makeDevErrorResponse(res, "Id already registered");
      }

      if (!utils.verifySignature(req.body.cid, req.body.public_key,
                                 req.body.signature)) {
        return utils.makeDevErrorResponse(res, 'Invalid signature');
      }

      req.g.a.r.u.addQuotaItem('register');

      if (req.body.peer_key) {
        // Use user provided key pair
      } else {
        // Generate new key pair
      }
      const u =
          req.g.a.r.u.addUser(req.body.id, req.body.name, req.body.public_key);
      return utils.makeResponse(res, {user : u});
    }
  });

  done();
}

function updateUser(fastify, options, done) {
  const schema = {
    body : {
      type : 'object',
      properties : {
        id : {type : 'string'},
        name : {type : 'string'},
        public_key : {type : 'string'},
        signature : {type : 'string'}
      },
      required : [ 'id', 'name', 'public_key', 'signature' ]
    }
  };

  fastify.post('/update', {
    schema : schema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.a.r.u),
    handler : async (req, res) => {
      // TODO: To support user changing their identity while
      // keep old data.
      const u = req.g.user;
      return utils.makeResponse(res, {user : u});
    }
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(getUser);
  fastify.register(listUsers);
  fastify.register(registerUser);
  fastify.register(updateUser);
  done();
}

export {routes}
