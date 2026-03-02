import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { ipns } from '@helia/ipns';
import { FsBlockstore } from 'blockstore-fs';
import { FsDatastore } from 'datastore-fs';
import { generateKeyPair } from '@libp2p/crypto/keys';
import { peerIdFromPrivateKey } from '@libp2p/peer-id';
import { CID } from 'multiformats/cid';

export interface IpfsAgentConfig {
  root: string;
  data_dir?: string;
  /** Optional path for Helia repo (blockstore, datastore). Defaults to path.join(data_dir ?? root, 'ipfs') */
  ipfs_path?: string;
}

export default class IpfsAgent {
  #helia: Awaited<ReturnType<typeof createHelia>> | null = null;
  #unixfs: ReturnType<typeof unixfs> | null = null;
  #ipns: ReturnType<typeof ipns> | null = null;
  #initialized = false;

  async asInit(config: IpfsAgentConfig): Promise<void> {
    if (this.#initialized) {
      return;
    }
    const heliaPath = config.ipfs_path ?? path.join(config.data_dir ?? config.root, 'ipfs');
    const blockstorePath = path.join(heliaPath, 'blocks');
    const datastorePath = path.join(heliaPath, 'data');

    const blockstore = new FsBlockstore(blockstorePath, { createIfMissing: true });
    const datastore = new FsDatastore(datastorePath, { createIfMissing: true });

    await blockstore.open();
    await datastore.open();

    const helia = await createHelia({ blockstore, datastore }) as Awaited<ReturnType<typeof createHelia>>;
    await helia.start();

    this.#helia = helia;
    this.#unixfs = unixfs(helia as unknown as Parameters<typeof unixfs>[0]);
    this.#ipns = ipns(helia as unknown as Parameters<typeof ipns>[0]);
    this.#initialized = true;
  }

  #ensureInit(): void {
    if (!this.#initialized || !this.#helia || !this.#unixfs || !this.#ipns) {
      throw new Error('IpfsAgent not initialized; call asInit(config) first');
    }
  }

  async stop(): Promise<void> {
    if (!this.#helia) return;
    await this.#helia.stop();
    this.#helia = null;
    this.#unixfs = null;
    this.#ipns = null;
    this.#initialized = false;
  }

  async addFile(filePath: string): Promise<string> {
    this.#ensureInit();
    const stream = createReadStream(filePath);
    const cid = await this.#unixfs!.addByteStream(stream);
    return cid.toString();
  }

  async fetchFile(cid: string, toPath: string): Promise<void> {
    this.#ensureInit();
    const parsed = CID.parse(cid);
    const dir = path.dirname(toPath);
    if (dir) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of this.#unixfs!.cat(parsed)) {
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);
    await fs.promises.writeFile(toPath, buf);
  }

  async pinCids(cids: string[]): Promise<void> {
    this.#ensureInit();
    for (const cidStr of cids) {
      const parsed = CID.parse(cidStr);
      for await (const _ of this.#unixfs!.cat(parsed)) {
        // consume stream so blocks are fetched into blockstore
      }
    }
  }

  async createIpnsName(name: string): Promise<string> {
    this.#ensureInit();
    const keychain = this.#helia!.libp2p.services.keychain;
    const privKey = await generateKeyPair('Ed25519');
    await keychain.importKey(name, privKey);
    const peerId = peerIdFromPrivateKey(privKey);
    return peerId.toString();
  }

  async publishName(key: string, cid: string): Promise<void> {
    this.#ensureInit();
    const parsed = CID.parse(cid);
    await this.#ipns!.publish(key, parsed, { offline: true });
  }
}
