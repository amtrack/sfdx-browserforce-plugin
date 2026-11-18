---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/index.e2e-spec.ts
---
<%
  const pascalCase = h.changeCase.pascalCase(name);
  const camelCase = h.changeCase.camelCase(name);
_%>
import assert from 'assert';
import { capture } from '../../../test/capture.js';
import { ENABLED_SELECTOR, type <%= pascalCase %>Config, <%= pascalCase %>, <%= camelCase %>Schema } from './index.js';

describe(<%= pascalCase %>.name, function() {
  let plugin: <%= pascalCase %>;
  before(() => {
    plugin = new <%= pascalCase %>(global.browserforce);
  });

  const configEnabled: <%= pascalCase %>Config = {
    enabled: true
  };
  const configDisabled: <%= pascalCase %>Config = {
    enabled: false
  };
  // the annotated screenshot of the documentation page of the setting, taken by CAPTURE=true npm run test:e2e in a
  // scratch org (src/plugins/<%= h.changeCase.paramCase(name) %>/screenshot.webp): see .claude/skills/document-setting/SKILL.md
  it('should enable @capture', capture(<%= camelCase %>Schema, {
    config: configEnabled,
    // the page that retrieve() opens, shot after the step
    pages: {
      screenshot: { pills: { enabled: ENABLED_SELECTOR } },
    },
  }));
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
