import {FastifyRequest} from 'fastify';
import DataRootDirAgent from '../DataRootDirAgent.js';
import IpfsAgent from '../IpfsAgent.js';
import Publisher from '../Publisher.js';
import TokenRecordAgent from '../TokenRecordAgent.js';
import UserRecordAgent from '../UserRecordAgent.js';
import User from '../data_types/User.js';

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

declare module 'fastify' {
  interface FastifyRequest {
    g?: {
      config: Config;
      a: {
        r: {
          u: UserRecordAgent;
          t: TokenRecordAgent;
        };
        d: DataRootDirAgent;
        ipfs: IpfsAgent;
      };
      publisher: Publisher;
      user?: User;
    };
  }
}

