import fs from 'node:fs';
import path from 'node:path';
import * as utils from 'pp-js-lib';

import User from './data_types/User.js';
import Quota from './Quota.js';

export default class UserRecordAgent {
  #mUsers = new Map();
  #mQuotas = new Map();
  #dataFilePath = null;

  init(config) {
    // Fields in config:
    // root:
    // users:
    this.#mUsers.clear();
    this.#mQuotas.clear();
    this.#dataFilePath = path.join(config.root, config.users);
    let ds = utils.readJsonFile(this.#dataFilePath);
    for (let d of ds.list) {
      this.#mUsers.set(d.id, new User(d));
    }
    // TODO: Load from config
    // 10 every 60s
    this.#mQuotas.set('register', new Quota({period : 60000, threshold : 10}));
  }

  hasQuota(key) {
    let q = this.#mQuotas.get(key);
    return q && q.isAvailable();
  }

  getAll() { return this.#mUsers.values().toArray(); }

  getUserById(id) { return this.#mUsers.get(id); }

  getUserByName(name) {
    // TODO: Improve efficiency
    for (let v of this.#mUsers.values()) {
      if (v.getName() == name) {
        return v;
      }
    }
    return null;
  }

  addQuotaItem(key) {
    let q = this.#mQuotas.get(key);
    if (q) {
      q.addItem();
    }
  }

  updateUser(u) {
    this.#mUsers.set(u.getId(), u);
    this.saveData();
  }

  initUser(userId, name, publicKey, peerId) {
    // Update user map in memory, format is in sync with users.json
    const u = new User(
        {id : userId, name : name, public_key : publicKey, peer_id : peerId});
    this.#mUsers.set(userId, u);
    this.saveData();
    return u;
  }

  saveData() {
    // Flush to db
    const ds = this.#mUsers.values().map(v => v.toJson()).toArray();
    const content = JSON.stringify({list : ds}, null, 2);
    fs.writeFileSync(this.#dataFilePath, content);
  }
}
