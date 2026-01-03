import DataRootDirAgent from './DataRootDirAgent.js';

let agent = new DataRootDirAgent();
agent.init({root: '/home/hongwei/data/test', data_dir: 'test'});
agent.getOrInitUserDir('QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy');

