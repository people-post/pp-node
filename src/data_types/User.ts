interface UserData {
  id: string;
  name: string;
  public_key: string;
  peer_id?: string;
  root_cid?: {
    latest?: string;
    published?: string;
    t_publish?: number;
  };
}

export default class User {
  #data: UserData;
  constructor(data: UserData) { this.#data = data; }

  getId(): string { return this.#data.id; }
  getName(): string { return this.#data.name; }
  getPeerId(): string | undefined { return this.#data.peer_id; }
  getPublicKey(): string { return this.#data.public_key; }
  getRootCid(): string | null {
    return this.#data.root_cid ? (this.#data.root_cid.latest ?? null) : null;
  }
  getUnpublishedRootCidAfter(tInterval: number): string | null {
    // tInterval is in ms

    let d = this.#data.root_cid;
    if (!d) {
      // No data yet
      return null;
    }
    if (!d.published || !d.t_publish) {
      // Nothing published yet
      return d.latest ?? null;
    }

    if (d.published == d.latest) {
      // Already latest
      return null;
    }

    if (Date.now() - d.t_publish < tInterval) {
      // Too soon
      return null;
    }

    return d.latest ?? null;
  }

  setRootCid(cid: string): void {
    if (!this.#data.root_cid) {
      this.#data.root_cid = {};
    }
    this.#data.root_cid.latest = cid;
  }

  markPublish(cid: string): void {
    if (!this.#data.root_cid) {
      this.#data.root_cid = {};
    }
    this.#data.root_cid.published = cid;
    this.#data.root_cid.t_publish = Date.now();
  }

  toJson(): UserData { return this.#data; }
  ltsToJsonApi(): {
    id: string;
    name: string;
    public_key: string;
    peer_id?: string;
    root_cid: string | null;
  } {
    return {
      id: this.getId(), name: this.getName(), public_key: this.getPublicKey(),
          peer_id: this.getPeerId(), root_cid: this.getRootCid()
    }
  }
}

