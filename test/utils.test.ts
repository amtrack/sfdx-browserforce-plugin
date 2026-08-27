import assert from 'assert';
import { z } from 'zod';
import { schemas } from '../src/plugins/index.js';
import { isEmptyObjectOrArray, maskSensitiveValues, password, semanticallyCleanObject } from '../src/plugins/utils.js';

describe('semanticallyCleanObject', () => {
  it('should clean object', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ id: 'a2' }), undefined);
  });
  it('should clean object with custom id', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ myid: 'a2' }, 'myid'), undefined);
  });
  it('should return object as is', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ id: 'a2', a: 'hi' }), {
      id: 'a2',
      a: 'hi',
    });
  });
  it('should return object as is with custom id', async () => {
    assert.deepStrictEqual(semanticallyCleanObject({ myid: 'a2', a: 'hi' }, 'myid'), {
      myid: 'a2',
      a: 'hi',
    });
  });
});

describe('isEmptyObjectOrArray', () => {
  const shouldBeEmpty: unknown[] = [[], {}];
  const shouldNotBeEmpty: unknown[] = [true, false, 'foo', { foo: 'bar' }, ['bar'], '', undefined, null];
  for (const t of shouldBeEmpty) {
    it(`${t} should be empty`, () => assert.ok(isEmptyObjectOrArray(t)));
  }
  for (const t of shouldNotBeEmpty) {
    it(`${t} should not be empty`, () => assert.ok(!isEmptyObjectOrArray(t)));
  }
});

describe('maskSensitiveValues', () => {
  it('should mask fields reached via additionalProperties', async () => {
    const schema = {
      type: 'object',
      propertyNames: { pattern: '.*' },
      additionalProperties: {
        properties: {
          consumerSecret: { 'x-password': true, type: 'string' },
          consumerKey: { type: 'string' },
        },
      },
    };
    const result = maskSensitiveValues({ myProvider: { consumerSecret: 's3cret', consumerKey: 'ck' } }, '', schema) as {
      myProvider: { consumerSecret: string; consumerKey: string };
    };
    assert.strictEqual(result.myProvider.consumerSecret, '****');
    assert.strictEqual(result.myProvider.consumerKey, 'ck');
  });

  it('should mask fields reached through a $ref', async () => {
    const schema = {
      definitions: {
        provider: { properties: { consumerSecret: { 'x-password': true } } },
      },
      additionalProperties: { $ref: '#/definitions/provider' },
    };
    const result = maskSensitiveValues({ myProvider: { consumerSecret: 's3cret' } }, '', schema) as {
      myProvider: { consumerSecret: string };
    };
    assert.strictEqual(result.myProvider.consumerSecret, '****');
  });

  it('should mask fields reached through an allOf-wrapped ref', async () => {
    const schema = {
      properties: {
        security: { allOf: [{ $ref: '#/definitions/security' }] },
      },
      definitions: {
        security: {
          properties: {
            certificates: {
              properties: { password: { 'x-password': true } },
            },
          },
        },
      },
    };
    const result = maskSensitiveValues({ security: { certificates: { password: 's3cret' } } }, '', schema) as {
      security: { certificates: { password: string } };
    };
    assert.strictEqual(result.security.certificates.password, '****');
  });

  it('should mask consumerSecret and not consumerKey when given the real converted auth-providers schema', async () => {
    const { authProvidersSchema } = await import('../src/plugins/auth-providers/index.js');
    const jsonSchema = z.toJSONSchema(authProvidersSchema, { target: 'draft-7', io: 'input' });
    const result = maskSensitiveValues(
      { myProvider: { consumerSecret: 's3cret', consumerKey: 'ck' } },
      '',
      jsonSchema,
    ) as { myProvider: { consumerSecret: string; consumerKey: string } };
    assert.strictEqual(result.myProvider.consumerSecret, '****');
    assert.strictEqual(result.myProvider.consumerKey, 'ck');
  });

  it('should still mask via regex fallback when no schema is given', async () => {
    const result = maskSensitiveValues({ consumerSecret: 'x' }, '', undefined) as { consumerSecret: string };
    assert.strictEqual(result.consumerSecret, '****');
  });

  it('should mask consumerSecret and not consumerKey when converted from the schemas map', async () => {
    const jsonSchema = z.toJSONSchema(schemas.authProviders, { target: 'draft-7', io: 'input' });
    const result = maskSensitiveValues(
      { myProvider: { consumerSecret: 's3cret', consumerKey: 'ck' } },
      '',
      jsonSchema,
    ) as { myProvider: { consumerSecret: string; consumerKey: string } };
    assert.strictEqual(result.myProvider.consumerSecret, '****');
    assert.strictEqual(result.myProvider.consumerKey, 'ck');
  });

  it('should mask a password nested behind a definitions-local $ref when converted from the schemas map', async () => {
    const jsonSchema = z.toJSONSchema(schemas.security, { target: 'draft-7', io: 'input' });
    const result = maskSensitiveValues(
      {
        certificateAndKeyManagement: {
          importFromKeystore: [{ name: 'n', filePath: '/tmp/keystore.p12', password: 's3cret' }],
        },
      },
      '',
      jsonSchema,
    ) as {
      certificateAndKeyManagement: {
        importFromKeystore: [{ filePath: string; password: string }];
      };
    };
    assert.strictEqual(result.certificateAndKeyManagement.importFromKeystore[0].password, '****');
    assert.strictEqual(result.certificateAndKeyManagement.importFromKeystore[0].filePath, '/tmp/keystore.p12');
  });

  it('should mask a $ref reused at two different paths, not only the first one visited', async () => {
    const schema = {
      definitions: {
        keystore: { properties: { password: { 'x-password': true } } },
      },
      properties: {
        a: { $ref: '#/definitions/keystore' },
        b: { $ref: '#/definitions/keystore' },
      },
    };
    const result = maskSensitiveValues({ a: { password: 'p1' }, b: { password: 'p2' } }, '', schema) as {
      a: { password: string };
      b: { password: string };
    };
    assert.strictEqual(result.a.password, '****');
    assert.strictEqual(result.b.password, '****');
  });

  it('should NOT mask a secret-looking field left unmarked by its schema (schema is the source of truth once provided)', async () => {
    // Intentional: once a schema is passed, the regex fallback is not consulted — pinned here so a
    // future author cannot rely on the fallback as a safety net for a forgotten password() marker.
    const schema = { properties: { apiToken: { type: 'string' } } };
    const result = maskSensitiveValues({ apiToken: 'shh' }, '', schema) as { apiToken: string };
    assert.strictEqual(result.apiToken, 'shh');
  });
});

describe('password', () => {
  it('should mark a schema as x-password while keeping existing metadata', async () => {
    const jsonSchema = z.toJSONSchema(z.object({ s: password(z.string().meta({ title: 'T' })) }), {
      target: 'draft-7',
      io: 'input',
    }) as unknown as { properties: { s: Record<string, unknown> } };
    assert.deepStrictEqual(jsonSchema.properties.s, { type: 'string', title: 'T', 'x-password': true });
  });

  it('should terminate on a $ref cycle instead of recursing forever', async () => {
    const schema = {
      definitions: {
        a: { properties: { b: { $ref: '#/definitions/a' } } },
      },
      $ref: '#/definitions/a',
    };
    const result = maskSensitiveValues({ b: { b: 'x' } }, '', schema);
    assert.ok(result);
  });
});
