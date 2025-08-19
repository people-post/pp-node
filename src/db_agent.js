import * as utils from 'brief-js-lib';
import fs from "node:fs";
import path from "node:path";

class Quota {
  #config = null;
  #records = [];

  constructor(config) { this.#config = config; }

  isAvailable() {
    // TODO: Support tiers
    let t = Date.now() - this.#config.period;
    let idx = this.#records.findIndex(x => x > t);
    let n = this.#records.length;
    if (idx > 0) {
      n -= idx;
    }

    return n < this.#config.threshold;
  }

  addItem() {
    // Remove useless items
    let t = Date.now() - this.#config.period;
    let idx = this.#records.findIndex(x => x > t);
    if (idx > 0) {
      // Remove item right before idx
      this.#records.splice(0, idx);
    }
    this.#records.push(Date.now());
  }
}

export default class DbAgent {
  #mUsers = new Map();
  #mQuotas = new Map();
  #usersFilePath = null;

  init(config) {
    this.#mUsers.clear();
    this.#mQuotas.clear();
    this.#usersFilePath = path.join(config.root, config.users);
    let d_users = utils.readJsonFile(this.#usersFilePath);
    for (let d of d_users.list) {
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
    fs.writeFileSync(this.#usersFilePath,
                     JSON.stringify({list : users}, null, 2));
  }
}
