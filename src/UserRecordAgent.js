import * as utils from 'brief-js-lib';
import fs from 'node:fs';
import path from 'node:path';

import Quota from './Quota.js';

export default class UserRecordAgent {
  #mUsers = new Map();
  #mQuotas = new Map();
  #recordsFilePath = null;

  init(config) {
    // Fields in config:
    // root:
    // users:
    this.#mUsers.clear();
    this.#mQuotas.clear();
    this.#recordsFilePath = path.join(config.root, config.users);
    let dUsers = utils.readJsonFile(this.#recordsFilePath);
    for (let d of dUsers.list) {
      this.#mUsers.set(d.id, d.public_key);
    }
    // TODO: Load from config
    // 10 every 60s
    this.#mQuotas.set('register', new Quota({period : 60000, threshold : 10}));
  }

  hasQuota(key) {
    let q = this.#mQuotas.get(key);
    return q && q.isAvailable();
  }

  getUser(id) {
    let key = this.#mUsers.get(id);
    return key ? {id : id, publicKey : key} : null;
  }

  addQuotaItem(key) {
    let q = this.#mQuotas.get(key);
    if (q) {
      q.addItem();
    }
  }

  addUser(userId, publicKey) {
    // TODO: Use db later
    // Update user map in memory
    this.#mUsers.set(userId, publicKey);

    // Flush to db
    let users = [];
    for (let [k, v] of this.#mUsers) {
      users.push({id : k, public_key : v});
    }
    fs.writeFileSync(this.#recordsFilePath,
                     JSON.stringify({list : users}, null, 2));
  }
}
