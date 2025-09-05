import * as utils from 'brief-js-lib';

function getConfig(fastify, options, done) {
  const schema = {
    query : {
      type : 'object',
      properties : {id : {type : 'string'}},
      required : [ 'id' ]
    }
  };

  fastify.get('/config', {
    handler : async (req, res) => {
      return utils.makeResponse(res, {
        enable_register : req.g.config.enable_register,
        enable_reclaim : req.g.config.enable_reclaim
      });
    }
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(getConfig);
  done();
}

export {routes}
