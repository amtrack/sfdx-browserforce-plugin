import { Org } from '@salesforce/core';
import { Browserforce } from '../src/browserforce';
import { UX } from '@salesforce/command';

before('global setup', async () => {
  const org = await Org.create({});
  const ux = await UX.create();
  const bf = new Browserforce(org, ux);
  global.bf = bf;
  await bf.login();
});

after('global setup', async () => {
  await global.bf.logout();
});
