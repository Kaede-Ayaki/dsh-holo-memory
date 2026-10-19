import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { probeEmbedding } from '../lib/embedding-probe.js';

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    return await run(`http://127.0.0.1:${port}/v1`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('probe classifies embedding vs chat vs error', async () => {
  await withServer(
    (req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const parsed = JSON.parse(body);
        res.setHeader('content-type', 'application/json');
        if (parsed.model === 'embed') {
          res.end(JSON.stringify({ model: 'embed', data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8] }] }));
        } else if (parsed.model === 'chat') {
          res.end(JSON.stringify({ model: 'chat', choices: [{ message: { content: 'hi' } }] }));
        } else {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'model not found' }));
        }
      });
    },
    async (baseUrl) => {
      const embedding = await probeEmbedding({ baseUrl, model: 'embed', apiKey: 'sk-x' });
      assert.equal(embedding.ok, true);
      assert.equal(embedding.kind, 'embedding');
      assert.equal(embedding.dimensions, 8);

      const chat = await probeEmbedding({ baseUrl, model: 'chat', apiKey: 'sk-x' });
      assert.equal(chat.ok, true);
      assert.equal(chat.kind, 'chat');

      const broken = await probeEmbedding({ baseUrl, model: 'missing', apiKey: 'sk-x' });
      assert.equal(broken.ok, false);
      assert.equal(broken.kind, 'error');
      assert.match(broken.message, /400/);
    },
  );
});

test('probe rejects a non-http URL before any request', async () => {
  const result = await probeEmbedding({ baseUrl: 'api.example.com/v1', model: 'x' });
  assert.equal(result.ok, false);
  assert.match(result.message, /http/);
});
