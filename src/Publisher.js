export default class Publisher {
  #aUser;
  #aIpfs;
  #iMin = 60000; // Minimun publishing interval, in miliseconds
  #tLastCall = Date.now();

  init(aUser, aIpfs, config) {
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

  publish() {
    // Scan updates and publish new records that meets interval requirements
    let hasChange = false;
    for (let u of this.#aUser.getAll()) {
      let cid = u.getUnpublishedRootCidAfter(this.#iMin);
      if (cid) {
        this.#aIpfs.publishName(u.getName(), cid);
        u.markPublish(cid);
        hasChange = true;
      }
    }

    if (hasChange) {
      this.#aUser.saveData();
    }
  }
}
