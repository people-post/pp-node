import fs from 'node:fs';
import path from 'node:path';
import { utils } from 'pp-js-lib';

import User from './data_types/User.js';
import Quota from './Quota.js';
import TokenRecordAgent from './TokenRecordAgent.js';

interface UserRecordAgentConfig {
  root: string;
  users: string;
}

interface UsersData {
  list: Array<{
    id: string;
    name: string;
    public_key: string;
    peer_id?: string;
    root_cid?: {
      latest?: string;
      published?: string;
      t_publish?: number;
    };
  }>;
}

export default class UserRecordAgent {
  #mUsers = new Map<string, User>();
  #mQuotas = new Map<string, Quota>();
  #dataFilePath: string | null = null;
  #tokenAgent: TokenRecordAgent | null = null;

  init(config: UserRecordAgentConfig): void {
    // Fields in config:
    // root:
    // users:
    this.#mUsers.clear();
    this.#mQuotas.clear();
    this.#dataFilePath = path.join(config.root, config.users);
    let ds: UsersData = utils.readJsonFile(this.#dataFilePath);
    for (let d of ds.list) {
      this.#mUsers.set(d.id, new User(d));
    }
    // TODO: Load from config
    // 10 every 60s
    this.#mQuotas.set('register', new Quota({period : 60000, threshold : 10}));
  }

  hasQuota(key: string): boolean {
    let q = this.#mQuotas.get(key);
    return q ? q.isAvailable() : false;
  }

  getAll(): IterableIterator<User> { return this.#mUsers.values(); }

  setTokenAgent(tokenAgent: TokenRecordAgent): void {
    this.#tokenAgent = tokenAgent;
  }

  getUser(token: string): User | null {
    // This method is used by authCheck from pp-js-lib
    // It expects a token and returns a User
    if (!this.#tokenAgent) {
      return null;
    }
    const userId = this.#tokenAgent.pop(token);
    if (!userId) {
      return null;
    }
    return this.getUserById(userId) || null;
  }

  getUserById(id: string): User | undefined { return this.#mUsers.get(id); }

  getUserByName(name: string): User | null {
    // TODO: Improve efficiency
    for (let v of this.#mUsers.values()) {
      if (v.getName() == name) {
        return v;
      }
    }
    return null;
  }

  addQuotaItem(key: string): void {
    let q = this.#mQuotas.get(key);
    if (q) {
      q.addItem();
    }
  }

  updateUser(u: User): void {
    this.#mUsers.set(u.getId(), u);
    this.saveData();
  }

  initUser(userId: string, name: string, publicKey: string, peerId: string): User {
    // Update user map in memory, format is in sync with users.json
    const u = new User(
        {id : userId, name : name, public_key : publicKey, peer_id : peerId});
    this.#mUsers.set(userId, u);
    this.saveData();
    return u;
  }

  saveData(): void {
    if (!this.#dataFilePath) {
      throw new Error('UserRecordAgent not initialized');
    }
    // Flush to db
    const ds = Array.from(this.#mUsers.values()).map(v => v.toJson());
    const content = JSON.stringify({list : ds}, null, 2);
    fs.writeFileSync(this.#dataFilePath, content);
  }
}

