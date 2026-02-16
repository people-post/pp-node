import cors from '@fastify/cors'
import multipart from '@fastify/multipart';
import FastifySchedule from '@fastify/schedule';
import FastifyStatic from '@fastify/static';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { privateKeyFromProtobuf } from '@libp2p/crypto/keys';
import { http } from '@libp2p/http';
import { nodeServer } from '@libp2p/http-server';
import { tcp } from '@libp2p/tcp';
import { Command } from 'commander';
import Fastify from 'fastify';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createLibp2p } from 'libp2p';
import { utils } from 'pp-js-lib';
import { AsyncTask, SimpleIntervalJob } from 'toad-scheduler';

import DataRootDirAgent from './DataRootDirAgent.js';
import IpfsAgent from './IpfsAgent.js';
import Publisher from './Publisher.js';
import { routes as hostRoutes } from './r_host.js';
import { routes as pinRoutes } from './r_pin.js';
import { routes as uploadRoutes } from './r_upload.js';
import { routes as userRoutes } from './r_user.js';
import TokenRecordAgent from './TokenRecordAgent.js';
import UserRecordAgent from './UserRecordAgent.js';
// Type definitions for Fastify request extensions are automatically loaded

interface Config {
  root: string;
  data_dir?: string;
  users: string;
  host?: string;
  port?: number;
  /** Path to libp2p key file (JSON with base64 PrivKey, or raw protobuf). Enables fixed peer id in multiaddrs. */
  peer_id_file?: string;
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

const taskPublish =
    new AsyncTask('Publisher', async () => { publisher.publish(); },
                  (err) => { console.error('Publisher error', err); });

console.info("Creating API server...");

// Single Node HTTP server: Fastify attaches via serverFactory; libp2p injects connections via nodeServer(server).
let httpServer: ReturnType<typeof createServer> | null = null;
const serverFactory = (handler: (req: any, res: any) => void, _opts: unknown) => {
  if (!httpServer) {
    httpServer = createServer(handler);
  }
  return httpServer;
};

const fastify = Fastify({ logger: true, serverFactory });

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
await fastify.ready();
fastify.scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 30 }, taskPublish));

if (!httpServer) {
  throw new Error('HTTP server was not created by serverFactory');
}

const listenHost = config.host ?? '0.0.0.0';
const listenPort = config.port ?? 0;
const listenMultiaddr = `/ip4/${listenHost}/tcp/${listenPort}`;

function loadPrivateKeyFromFile(root: string, filePath: string): ReturnType<typeof privateKeyFromProtobuf> {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  const raw = fs.readFileSync(resolved);
  let protobuf: Uint8Array;
  const first = raw[0];
  if (first === 0x7b) {
    // '{' — JSON (e.g. IPFS-style {"Id":"...", "PrivKey":"<base64>"})
    const json = JSON.parse(raw.toString('utf8')) as { PrivKey?: string };
    if (json.PrivKey == null) {
      throw new Error(`peer_id_file ${filePath}: missing "PrivKey" in JSON`);
    }
    protobuf = Buffer.from(json.PrivKey, 'base64');
  } else {
    protobuf = raw;
  }
  return privateKeyFromProtobuf(protobuf);
}

const libp2pOptions: Parameters<typeof createLibp2p>[0] = {
  addresses: { listen: [listenMultiaddr] },
  transports: [tcp()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    http: http({
      server: nodeServer(httpServer),
    }),
  },
};

if (config.peer_id_file) {
  libp2pOptions.privateKey = loadPrivateKeyFromFile(config.root, config.peer_id_file);
}

const node = await createLibp2p(libp2pOptions);

console.info('Server listening on libp2p:');
node.getMultiaddrs().forEach((ma) => {
  console.info('  %s', ma.toString());
});
console.info('Running...');

