import cors from '@fastify/cors'
import multipart from '@fastify/multipart';
import FastifySchedule from '@fastify/schedule';
import FastifyStatic from '@fastify/static';
import {Command} from 'commander';
import Fastify from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { utils } from 'pp-js-lib';
import {AsyncTask, SimpleIntervalJob} from 'toad-scheduler';

import DataRootDirAgent from './DataRootDirAgent.js';
import IpfsAgent from './IpfsAgent.js';
import Publisher from './Publisher.js';
import {routes as hostRoutes} from './r_host.js';
import {routes as pinRoutes} from './r_pin.js';
import {routes as uploadRoutes} from './r_upload.js';
import {routes as userRoutes} from './r_user.js';
import TokenRecordAgent from './TokenRecordAgent.js';
import UserRecordAgent from './UserRecordAgent.js';
// Type definitions for Fastify request extensions are automatically loaded

interface Config {
  root: string;
  data_dir?: string;
  users: string;
  host?: string;
  port?: number;
  ssl_key?: string;
  ssl_cert?: string;
  enable_register?: boolean;
  enable_reclaim?: boolean;
  min_publish_interval?: number;
  debug?: boolean;
}

const command = new Command();
command.version('1.0.0')
    .usage('[OPTIONS]...')
    .requiredOption('-d, --dir <dir>', 'Working directory root.');
command.parse();

const options = command.opts();
console.log("Root dir:", options.dir);

const config: Config = utils.readJsonFile(path.join(options.dir, "config.json"));
config.root = options.dir;
const aUserRecord = new UserRecordAgent();
aUserRecord.init({root : config.root, users : config.users});
const aDataRoot = new DataRootDirAgent();
aDataRoot.init({root : config.root, data_dir : config.data_dir});
const aToken = new TokenRecordAgent();
aUserRecord.setTokenAgent(aToken);
const aIpfs = new IpfsAgent();
const publisher = new Publisher();
publisher.init(aUserRecord, aIpfs, {minInterval : config.min_publish_interval});

let httpsConfig: {key: Buffer; cert: Buffer} | null = null;
if (config.ssl_key && config.ssl_cert) {
  httpsConfig = {
    key : fs.readFileSync(path.join(config.root, config.ssl_key)),
    cert : fs.readFileSync(path.join(config.root, config.ssl_cert))
  };
}

const taskPublish =
    new AsyncTask('Publisher', async () => { publisher.publish(); },
                  (err) => { console.error('Publisher error', err); });

console.info("Creating API server...");

const fastify = httpsConfig 
  ? Fastify({logger : true, https : httpsConfig as any})
  : Fastify({logger : true});

// a: agent
//   r: record
//   d: data
//   ipfs: ipfs
(fastify as any).addHook('onRequest', async (req: any, _reply: any) => {
  if (!req.g) {
    req.g = {
      config : config,
      a : {r : {u : aUserRecord, t : aToken}, d : aDataRoot, ipfs : aIpfs},
      publisher : publisher
    };
  }
});

(fastify as any).register(cors, {
  origin : '*',
  methods : [ 'GET', 'POST', 'DELETE', 'OPTIONS' ],
  strictPreflight : false
});

(fastify as any).register(FastifyStatic, {root : path.join(config.root, 'static')});

(fastify as any).register(multipart, {
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
(fastify as any).register(FastifySchedule);
(fastify as any).register(hostRoutes, {prefix : '/api/host'});
(fastify as any).register(userRoutes, {prefix : '/api/user'});
(fastify as any).register(pinRoutes, {prefix : '/api/pin'});
(fastify as any).register(uploadRoutes, {prefix : '/api/upload'});
fastify.ready().then(() => {fastify.scheduler.addSimpleIntervalJob(
                         new SimpleIntervalJob({seconds : 30}, taskPublish))});

const c: {
  host?: string;
  port?: number;
  logger?: boolean;
} = {
  host : config.host,
  port : config.port
};

if (config.debug) {
  c.logger = true;
}

fastify.listen(c);

console.info("Running...");

