export default class Quota {
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
