import assert from 'assert';
import { CertificateAndKeyManagement, Config } from './index.js';

type T = {
  description: string;
  source: Config;
  target: Config;
  expected: Config | undefined;
};

const tests: T[] = [
  {
    description: 'should not do anything if keystore already exists',
    source: {
      importFromKeystore: [
        {
          name: 'Dummy',
        },
      ],
    },
    target: {
      importFromKeystore: [
        {
          name: 'Dummy',
          filePath: 'foo.jks',
        },
      ],
    },
    expected: undefined,
  },
  {
    description: 'should try to import keystore',
    source: {
      importFromKeystore: [
        {
          name: 'Foo',
        },
      ],
    },
    target: {
      importFromKeystore: [
        {
          name: 'Dummy',
          filePath: 'foo.jks',
        },
      ],
    },
    expected: {
      importFromKeystore: [
        {
          name: 'Dummy',
          filePath: 'foo.jks',
        },
      ],
    },
  },
];

describe('CertificateAndKeyManagement', () => {
  describe('diff()', () => {
    const p = new CertificateAndKeyManagement(global.browserforce);
    for (const t of tests) {
      it(t.description, () => {
        const actual = p.diff(t.source, t.target);
        assert.deepStrictEqual(actual, t.expected);
      });
    }
  });
});
