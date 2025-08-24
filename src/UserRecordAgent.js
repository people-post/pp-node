import * as utils from 'brief-js-lib';
import fs from 'node:fs';
import path from 'node:path';

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
      this.#mUsers.set(d.id, d);
    }
    // TODO: Load from config
    // 10 every 60s
    this.#mQuotas.set('register', new Quota({period : 60000, threshold : 10}));
  }

  hasQuota(key) {
    let q = this.#mQuotas.get(key);
    return q && q.isAvailable();
  }

  getAll() { return this.#mUsers.values().map(v => this.#toJson(v)).toArray(); }

  getUser(id) {
    let v = this.#mUsers.get(id);
    return v ? this.#toJson(v) : null;
  }

  addQuotaItem(key) {
    let q = this.#mQuotas.get(key);
    if (q) {
      q.addItem();
    }
  }

  addUser(userId, name, publicKey) {
    // TODO: Use db later
    // Update user map in memory
    const d = {id : userId, name : name, public_key : publicKey};
    this.#mUsers.set(userId, d);

    // Flush to db
    const ds = this.#mUsers.values().toArray();
    const content = JSON.stringify({list : ds}, null, 2);
    fs.writeFileSync(this.#dataFilePath, content);
  }

  #toJson(dUser) {
    return {id : dUser.id, name : dUser.name, publicKey : dUser.public_key};
  }
}
