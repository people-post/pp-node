import crypto from 'node:crypto';

interface TokenRecord {
  timestamp: number;
  token: string;
  userId: string;
}

export default class TokenRecordAgent {
  #records: TokenRecord[] = [];

  initFor(userId: string): string {
    // Remove useless items
    const t = Date.now() - 60000; // 1min
    const idx = this.#records.findIndex(x => x.timestamp > t);
    if (idx > 0) {
      // Remove item right before idx
      this.#records.splice(0, idx);
    }

    const v = this.#generateSecureRandomString(256);
    this.#records.push({timestamp : Date.now(), token : v, userId : userId});
    return v;
  }

  pop(token: string): string | null {
    const idx = this.#records.findIndex(x => x.token == token);
    if (idx < 0) {
      return null;
    }
    const userId = this.#records[idx].userId;
    this.#records.splice(idx, 1);
    return userId;
  }

  #generateSecureRandomString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
  }
}

