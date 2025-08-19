import * as utils from 'brief-js-lib';
import child_process from 'child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function upload(fastify, opts, done) {
  const schema = {
    body : {
      type : 'object',
      properties : {
        data : {type : 'string'},
        id : {type : 'string'},
        sig : {type : 'string'}
      }
    }
  };

  fastify.post('/upload', {
    schema : schema,
    preHandler : async (req, res) => utils.authCheck(req, res, req.g.db),
    handler : async (req, res) => {
      if (!utils.verifySignature(req.body.data, req.g.user.publicKey,
                                 req.body.sig)) {
        return utils.makeErrorResponse(res, 'sig not verified');
      }

      let dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dummy-'));
      let filePath = path.join(dirPath, "dummy");
      fs.writeFileSync(filePath, req.body.data);
      const cmd = 'ipfs add --pin=false ' + filePath;
      const stdout = child_process.execSync(cmd);
      // stdout: Added <cid> name
      const cid = stdout.toString().split(" ")[1];
      return utils.makeResponse(res, {cid : cid});
    }
  });

  done();
}

function routes(fastify, opts, done) {
  fastify.register(upload);
  done();
}

export {routes}
