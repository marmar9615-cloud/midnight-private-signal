import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { type AddressInfo } from 'node:net';
import { createMetadataServer } from './index.js';

describe('metadata API', () => {
  const server = createMetadataServer();
  let baseUrl = '';

  before(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('serves health status', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
  });

  it('serves default campaign metadata', async () => {
    const response = await fetch(`${baseUrl}/campaign`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.id, 'private-signal-board');
    assert.equal(body.network, 'preprod');
  });

  it('stores contract metadata by address', async () => {
    const response = await fetch(`${baseUrl}/contracts/0200abc123def456/metadata`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        label: 'First preprod deployment',
        notes: 'Metadata stays off-chain; the Compact contract owns author control.',
        tags: ['preprod', 'demo'],
      }),
    });
    assert.equal(response.status, 200);

    const stored = await fetch(`${baseUrl}/contracts/0200abc123def456/metadata`);
    const body = await stored.json();
    assert.equal(stored.status, 200);
    assert.equal(body.label, 'First preprod deployment');
    assert.deepEqual(body.tags, ['preprod', 'demo']);
  });

  it('rejects oversized notes', async () => {
    const response = await fetch(`${baseUrl}/contracts/0200abc123def457/metadata`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        label: 'Bad metadata',
        notes: 'x'.repeat(801),
        tags: [],
      }),
    });
    assert.equal(response.status, 400);
  });
});
