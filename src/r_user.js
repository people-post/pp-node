import Ajv from 'ajv';
import * as utils from 'pp-js-lib';

function getUser(fastify, options, done) {
  const schema = {
    query : {
      oneOf : [
        {
          type : 'object',
          properties : {id : {type : 'string'}},
          required : [ 'id' ]
        },
        {
          type : 'object',
          properties : {name : {type : 'string'}},
          required : [ 'name' ]
        }
      ]
    }
  };

  fastify.get('/get', {
    schema : schema,
    handler : async (req, res) => {
      let u;
      if (req.query.id) {
        u = req.g.a.r.u.getUserById(req.query.id);
      } else {
        u = req.g.a.r.u.getUserByName(req.query.name);
      }
      return utils.makeResponse(res, {user : u ? u.toJson() : null});
    }
  });

  done();
}

function listUsers(fastify, options, done) {
  fastify.get('/list', {
    handler : async (req, res) => {
      let dUsers = [];
      for (let u of req.g.a.r.u.getAll()) {
        dUsers.push(u.toJson());
      }
      return utils.makeResponse(res, {users : dUsers});
    }
  });

  done();
}

function registerUser(fastify, options, done) {
  const bodySchema = {
    body : {
      type : 'object',
      properties : {
        data : {type : 'string'},
        public_key : {type : 'string'},
        signature : {type : 'string'}
      },
      required : [ 'data', 'public_key', 'signature' ]
    }
  };

  const objSchema = {
    type : 'object',
    properties : {
      id : {type : 'string'},
      name : {type : 'string'},
      peer_key : {type : 'string'}
    },
    required : [ 'id', 'name' ]
  };

  const ajv = new Ajv();
  const objValidate = ajv.compile(objSchema);

  fastify.post('/register', {
    schema : bodySchema,
    handler : async (req, res) => {
      if (!req.g.config.enable_register) {
        return utils.makeDevErrorResponse(res, 'Registration disabled');
      }

      if (!utils.verifySignature(req.body.data, req.body.public_key,
                                 req.body.signature)) {
        return utils.makeDevErrorResponse(res, 'Invalid signature');
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

      if (!req.g.a.r.u.hasQuota('register')) {
        return utils.makeLimitationResponse(res, 'E_LIMIT_REACHED');
      }

      if (req.g.a.r.u.getUserById(d.id)) {
        return utils.makeDevErrorResponse(res, "Id already registered");
      }

      if (req.g.a.r.u.getUserByName(d.name)) {
        return utils.makeDevErrorResponse(res, "Name already taken");
      }

      req.g.a.r.u.addQuotaItem('register');
      let peerId;
      // TODO:
      // if (d.peer_key) {
      //  Use user provided key pair
      //} else {
      // Generate new key pair
      peerId = req.g.a.ipfs.createIpnsName(d.name);
      //}

      const u = req.g.a.r.u.setUser(d.id, d.name, req.body.public_key, peerId);
      return utils.makeResponse(res, {user : u.toJson()});
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
