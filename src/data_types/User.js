export default class User {
  #data;
  constructor(data) { this.#data = data; }

  getId() { return this.#data.id; }
  getName() { return this.#data.name; }
  getPublicKey() { return this.#data.public_key; }

  toJson() { return this.#data; }
}
