import assert from 'node:assert';
import { readdirSync } from 'node:fs';

const commandsDir = new URL('../../src/commands/', import.meta.url);

describe('command help texts', () => {
  it('should not contain "${" in summary, description or usage, which `sf commands` evaluates as a lodash template', async () => {
    const files = readdirSync(commandsDir, { recursive: true, encoding: 'utf8' }).filter((file) =>
      file.endsWith('.ts'),
    );
    assert.ok(files.length > 0);
    for (const file of files) {
      const module = (await import(new URL(file.replaceAll('\\', '/'), commandsDir).href)) as Record<string, unknown>;
      for (const command of Object.values(module).filter((value) => typeof value === 'function')) {
        const { summary, description, usage } = command as {
          summary?: unknown;
          description?: unknown;
          usage?: unknown;
        };
        for (const text of [summary, description, usage]) {
          assert.ok(!String(text ?? '').includes('${'), `${file}: ${String(text)}`);
        }
      }
    }
  }).timeout(10_000);
});
