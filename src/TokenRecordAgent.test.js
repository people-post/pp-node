
import TokenRecordAgent from './TokenRecordAgent.js';

let agent = new TokenRecordAgent();
let t = agent.initFor('abc');
console.log(t);
console.log(agent.pop(t));
