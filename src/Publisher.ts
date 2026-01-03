import UserRecordAgent from './UserRecordAgent.js';
import IpfsAgent from './IpfsAgent.js';

interface PublisherConfig {
  minInterval?: number;
}

export default class Publisher {
  #aUser: UserRecordAgent | null = null;
  #aIpfs: IpfsAgent | null = null;
  #iMin: number = 60000; // Minimun publishing interval, in miliseconds

  init(aUser: UserRecordAgent, aIpfs: IpfsAgent, config: PublisherConfig): void {
    this.#aUser = aUser;
    this.#aIpfs = aIpfs;
    if (config.minInterval) {
      if (config.minInterval < 60) {
        throw new Error('minInterval in Publisher cannot be less than 60');
      } else {
        this.#iMin = config.minInterval * 1000;
      }
    }
  }

  publish(): void {
    if (!this.#aUser || !this.#aIpfs) {
      throw new Error('Publisher not initialized');
    }
    // Scan updates and publish new records that meets interval requirements
    let hasChange = false;
    for (let u of this.#aUser.getAll()) {
      let cid = u.getUnpublishedRootCidAfter(this.#iMin);
      if (cid) {
        const name = u.getName();
        this.#aIpfs.publishName(name, cid);
        u.markPublish(cid);
        hasChange = true;
      }
    }

    if (hasChange) {
      this.#aUser.saveData();
    }
  }
}

