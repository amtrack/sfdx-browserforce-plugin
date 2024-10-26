import { Org } from '@salesforce/core';
import { Browserforce } from '../src/browserforce.js';
import { Ux } from '@salesforce/sf-plugins-core';

before('global setup', async () => {
  const org = await Org.create({});
  const ux = new Ux();
  const bf = new Browserforce(org, ux);
  global.bf = bf;
  await bf.login();
});

after('global setup', async () => {
  await global.bf.logout();
});
