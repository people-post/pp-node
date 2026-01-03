import {FastifyInstance, FastifyPluginOptions} from 'fastify';
import * as utils from 'pp-js-lib';

function getInfo(fastify: FastifyInstance, _options: FastifyPluginOptions, done: () => void) {
  fastify.get('/info', {
    handler : async (req, res) => {
      if (!req.g) {
        return res.status(500).send({error: 'Internal server error'});
      }
      // TODO: Dynamically get peer id
      return utils.makeResponse(res, {
        info : {
          register : {
            type : 'PEER', // PEER/GROUP
            is_enabled : req.g.config.enable_register,
            is_reclaim_enabled : req.g.config.enable_reclaim,
          },
          publisher : {
            is_enabled : true,
          },
          storages : [ 'TEXT', 'IMAGE', 'FILE' ], // TEXT/IMAGE/AUDIO/VIDEO/FILE
          peer_id :
              'k51qzi5uqu5dged5qgsvt2mvkdsmfxnvdrr1o1h6ak1fbcpsqsbyj45bhn66yb'
        }
      });
    }
  });

  done();
}

function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions, done: () => void) {
  fastify.register(getInfo);
  done();
}

export {routes}

