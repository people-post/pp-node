import cors from '@fastify/cors'
import multipart from '@fastify/multipart';
import * as utils from 'brief-js-lib';
import {Command} from 'commander';
import Fastify from "fastify";
import path from "node:path";

import DataRootDirAgent from './DataRootDirAgent.js';
import {routes as idRoutes} from './r_id.js';
import {routes as pinRoutes} from './r_pin.js';
import {routes as uploadRoutes} from './r_upload.js';
import UserRecordAgent from './UserRecordAgent.js';

let command = new Command();
command.version('1.0.0')
    .usage('[OPTIONS]...')
    .requiredOption('-d, --dir <dir>', 'Working directory root.');
command.parse();

const options = command.opts();
console.log("Root dir:", options.dir);

let config = utils.readJsonFile(path.join(options.dir, "config.json"));
config.root = options.dir;
let db = new UserRecordAgent();
db.init({root : config.root, users : config.users});
let aDataRoot = new DataRootDirAgent();
aDataRoot.init({root : config.root, data_dir : config.data_dir});

console.info("Creating API server...");

const fastify = Fastify({logger : true});

fastify.addHook('preHandler', async (req, res) => {
  if (!req.g) {
    req.g = {config : config, db : db, aDataRoot : aDataRoot};
  }
});

fastify.register(cors, {
  origin : '*',
  methods : [ 'GET', 'POST', 'DELETE', 'OPTIONS' ],
  strictPreflight : false
});

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
fastify.register(idRoutes, {prefix : '/api/id'});
fastify.register(pinRoutes, {prefix : '/api/pin'});
fastify.register(uploadRoutes, {prefix : '/api/upload'});

let c = {host : config.host, port : config.port};
if (config.debug) {
  c.logger = true;
}

fastify.listen(c);

console.info("Running...");
