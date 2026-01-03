interface QuotaConfig {
  threshold: number;
  period: number;
}

export default class Quota {
  #config: QuotaConfig | null = null;
  #records: number[] = [];

  constructor(config: QuotaConfig) {
    // Fields in config:
    // threshold:
    // period:
    this.#config = config;
  }

  isAvailable(): boolean {
    // TODO: Support tiers
    if (!this.#config) return false;
    let t = Date.now() - this.#config.period;
    let idx = this.#records.findIndex(x => x > t);
    let n = this.#records.length;
    if (idx > 0) {
      n -= idx;
    }

    return n < this.#config.threshold;
  }

  addItem(): void {
    if (!this.#config) return;
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

