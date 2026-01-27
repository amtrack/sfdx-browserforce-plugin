---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/index.e2e-spec.ts
---
import assert from 'assert';
import { type Config, <%= h.changeCase.pascalCase(name) %> } from './index.js';

describe(<%= h.changeCase.pascalCase(name) %>.name, function() {
  let plugin: <%= h.changeCase.pascalCase(name) %>;
  before(() => {
    plugin = new <%= h.changeCase.pascalCase(name) %>(global.browserforce);
  });

  const configEnabled: Config = {
    enabled: true
  };
  const configDisabled: Config = {
    enabled: true
  };
  it('should enable', async () => {
    await plugin.run(configEnabled);
  });
  it('should already be enabled', async () => {
    const res = await plugin.run(configEnabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
  it('should disable', async () => {
    await plugin.run(configDisabled);
  });
  it('should already be disabled', async () => {
    const res = await plugin.run(configDisabled);
    assert.deepStrictEqual(res, { message: 'no action necessary' });
  });
});
