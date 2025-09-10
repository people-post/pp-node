import cors from '@fastify/cors'
import multipart from '@fastify/multipart';
import FastifyStatic from '@fastify/static';
import {Command} from 'commander';
import Fastify from "fastify";
import path from "node:path";
import * as utils from 'pp-js-lib';

import DataRootDirAgent from './DataRootDirAgent.js';
import IpfsAgent from './IpfsAgent.js';
import {routes as hostRoutes} from './r_host.js';
import {routes as pinRoutes} from './r_pin.js';
import {routes as uploadRoutes} from './r_upload.js';
import {routes as userRoutes} from './r_user.js';
import TokenRecordAgent from './TokenRecordAgent.js';
import UserRecordAgent from './UserRecordAgent.js';

const command = new Command();
command.version('1.0.0')
    .usage('[OPTIONS]...')
    .requiredOption('-d, --dir <dir>', 'Working directory root.');
command.parse();

const options = command.opts();
console.log("Root dir:", options.dir);

const config = utils.readJsonFile(path.join(options.dir, "config.json"));
config.root = options.dir;
const aUserRecord = new UserRecordAgent();
aUserRecord.init({root : config.root, users : config.users});
const aDataRoot = new DataRootDirAgent();
aDataRoot.init({root : config.root, data_dir : config.data_dir});
const aToken = new TokenRecordAgent();
const aIpfs = new IpfsAgent();

console.info("Creating API server...");

const fastify = Fastify({logger : true});

fastify.addHook('preHandler', async (req, res) => {
  if (!req.g) {
    req.g = {
      config : config,
      a : {r : {u : aUserRecord, t : aToken}, d : aDataRoot, ipfs : aIpfs}
    };
  }
});

fastify.register(cors, {
  origin : '*',
  methods : [ 'GET', 'POST', 'DELETE', 'OPTIONS' ],
  strictPreflight : false
});

fastify.register(FastifyStatic, {root : path.join(config.root, 'static')});

fastify.register(multipart, {
  limits : {
    fieldNameSize : 100, // Max field name size in bytes
    fieldSize : 5000,    // Max field value size in bytes
    fields : 10,         // Max number of non-file fields
    fileSize : 50000000, // For multipart forms, the max file size in bytes
    files : 1,           // Max number of file fields
    headerPairs : 2000,  // Max number of header key=>value pairs
    parts : 100 // For multipart forms, the max number of parts (fields + files)
  }
});
fastify.register(hostRoutes, {prefix : '/api/host'});
fastify.register(userRoutes, {prefix : '/api/user'});
fastify.register(pinRoutes, {prefix : '/api/pin'});
fastify.register(uploadRoutes, {prefix : '/api/upload'});

const c = {
  host : config.host,
  port : config.port
};

if (config.debug) {
  c.logger = true;
}

fastify.listen(c);

console.info("Running...");
