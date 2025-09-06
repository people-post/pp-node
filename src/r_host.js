import * as utils from 'brief-js-lib';

function getInfo(fastify, options, done) {
  const schema = {
    query : {
      type : 'object',
      properties : {id : {type : 'string'}},
      required : [ 'id' ]
    }
  };

  fastify.get('/info', {
    handler : async (req, res) => {
      // TODO: Dynamically get peer id
      return utils.makeResponse(res, {
        is_register_enabled : req.g.config.enable_register,
        is_reclaim_enabled : req.g.config.enable_reclaim,
        peer_id :
            'k51qzi5uqu5dged5qgsvt2mvkdsmfxnvdrr1o1h6ak1fbcpsqsbyj45bhn66yb'
      });
    }
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(getInfo);
  done();
}

export {routes}
