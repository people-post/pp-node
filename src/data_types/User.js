export default class User {
  #data;
  constructor(data) { this.#data = data; }

  getId() { return this.#data.id; }
  getName() { return this.#data.name; }
  getPeerId() { return this.#data.peer_id; }
  getPublicKey() { return this.#data.public_key; }
  getRootCid() {
    return this.#data.root_cid ? this.#data.root_cid.latest : null;
  }
  getUnpublishedRootCidAfter(tInterval) {
    // tInterval is in ms

    let d = this.#data.root_cid;
    if (!d) {
      // No data yet
      return null;
    }
    if (!d.published || !d.t_publish) {
      // Nothing published yet
      return d.latest;
    }

    if (d.published == d.latest) {
      // Already latest
      return null;
    }

    if (Date.now() - d.t_publish < tInterval) {
      // Too soon
      return null;
    }

    return d.latest;
  }

  setRootCid(cid) {
    if (!this.#data.root_cid) {
      this.#data.root_cid = {};
    }
    this.#data.root_cid.latest = cid;
  }

  markPublish(cid) {
    this.#data.root_cid.published = cid;
    this.#data.root_cid.t_publish = Date.now();
  }

  toJson() { return this.#data; }
  ltsToJsonApi() {
    return {
      id: this.getId(), name: this.getName(), public_key: this.getPublicKey(),
          peer_id: this.getPeerId(), root_cid: this.getRootCid()
    }
  }
}
