export default class User {
  #data;
  constructor(data) { this.#data = data; }

  getName() { return this.#data.name; }

  toJson() { return this.#data; }
}
