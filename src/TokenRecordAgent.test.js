import assert from 'node:assert';
import test from 'node:test';

import TokenRecordAgent from './TokenRecordAgent.js';

test.describe('TokenRecordAgent test', () => {
  test.it('init and pop', () => {
    let agent = new TokenRecordAgent();
    let userId = 'abc';
    let t = agent.initFor(userId);
    assert.ok(t.length > 0);
    assert.equal(agent.pop(t), userId);
    assert.equal(agent.pop(t), null);
  });
});
