---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/index.e2e-spec.ts
---
<%
  const pascalCase = h.changeCase.pascalCase(name);
_%>
import assert from 'assert';
import { type <%= pascalCase %>Config, <%= pascalCase %> } from './index.js';

describe(<%= pascalCase %>.name, function() {
  let plugin: <%= pascalCase %>;
  before(() => {
    plugin = new <%= pascalCase %>(global.browserforce);
  });

  const configEnabled: <%= pascalCase %>Config = {
    enabled: true
  };
  const configDisabled: <%= pascalCase %>Config = {
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
