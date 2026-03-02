import Ajv from 'ajv';
import {FastifyInstance, FastifyPluginOptions} from 'fastify';
import { utils } from 'pp-js-lib';

function getUser(fastify: FastifyInstance, _options: FastifyPluginOptions, done: () => void) {
  fastify.get('/get', {
    schema: {
      querystring: {
        oneOf: [
          {
            type: 'object',
            properties: {id: {type: 'string'}},
            required: ['id']
          },
          {
            type: 'object',
            properties: {name: {type: 'string'}},
            required: ['name']
          }
        ]
      }
    },
    handler : async (req, res) => {
      if (!req.g) {
        return res.status(500).send({error: 'Internal server error'});
      }
      let u;
      if (req.query && typeof req.query === 'object' && 'id' in req.query) {
        u = req.g.a.r.u.getUserById(req.query.id as string);
      } else if (req.query && typeof req.query === 'object' && 'name' in req.query) {
        u = req.g.a.r.u.getUserByName(req.query.name as string);
      }
      return utils.makeResponse(res, {user : u ? u.ltsToJsonApi() : null});
    }
  });

  done();
}

function listUsers(fastify: FastifyInstance, _options: FastifyPluginOptions, done: () => void) {
  fastify.get('/list', {
    handler : async (req, res) => {
      if (!req.g) {
        return res.status(500).send({error: 'Internal server error'});
      }
      let dUsers = [];
      for (let u of req.g.a.r.u.getAll()) {
        dUsers.push(u.ltsToJsonApi());
      }
      return utils.makeResponse(res, {users : dUsers});
    }
  });

  done();
}

function registerUser(fastify: FastifyInstance, _options: FastifyPluginOptions, done: () => void) {
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
      if (!req.g) {
        return res.status(500).send({error: 'Internal server error'});
      }
      if (!req.g.config.enable_register) {
        return utils.makeDevErrorResponse(res, 'Registration disabled');
      }

      const body = req.body as {data: string; public_key: string; signature: string};
      if (!utils.verifySignature(body.data, body.public_key, body.signature)) {
        return utils.makeDevErrorResponse(res, 'Invalid signature');
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

      if (!req.g.a.r.u.hasQuota('register')) {
        return utils.makeLimitationResponse(res, 'E_LIMIT_REACHED');
      }

      const userData = d as {id: string; name: string; peer_key?: string};
      if (req.g.a.r.u.getUserById(userData.id)) {
        return utils.makeDevErrorResponse(res, 'Id already registered');
      }

      if (req.g.a.r.u.getUserByName(userData.name)) {
        return utils.makeDevErrorResponse(res, 'Name already taken');
      }

      req.g.a.r.u.addQuotaItem('register');
      let peerId: string;
      // TODO:
      // if (d.peer_key) {
      //  Use user provided key pair
      //} else {
      // Generate new key pair
      peerId = await req.g.a.ipfs.createIpnsName(userData.name);
      //}

      const u = req.g.a.r.u.initUser(userData.id, userData.name, body.public_key, peerId);
      return utils.makeResponse(res, {user : u.ltsToJsonApi()});
    }
  });

  done();
}

function updateUser(fastify: FastifyInstance, _options: FastifyPluginOptions, done: () => void) {
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
    preHandler : async (req, res) => utils.authCheck(req, res, req.g!.a.r.u),
    handler : async (req, res) => {
      if (!req.g || !req.g.user) {
        return res.status(500).send({error: 'Internal server error'});
      }
      // TODO: To support user changing their identity while
      // keep old data.
      const u = req.g.user;
      return utils.makeResponse(res, {user : u});
    }
  });

  done();
}

function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void) {
  fastify.register(getUser);
  fastify.register(listUsers);
  fastify.register(registerUser);
  fastify.register(updateUser);
  done();
}

export {routes}

