import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeConfig } from '../lib/config.js';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { EmbeddingClient } from '../lib/embeddings.js';
import { sourceFromTurn } from '../lib/source.js';
import { registerConsole } from '../lib/console.js';

function capture() {
  const project = projectIdFor('D:\\work\\demo');
  return {
    sessionId: 's-console',
    turn: 7,
    cwd: 'D:\\work\\demo',
    projectKey: project.key,
    projectLabel: project.label,
    userTexts: ['记住：控制台测试使用 pnpm test。'],
    assistantTexts: ['好的。'],
    startedAt: Date.now(),
    seqStart: 10,
    seqEnd: 18,
  };
}

test('console exposes stats, doctor and open routes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-console-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const turn = capture();
  const now = Date.now();
  const record = {
    id: newId('l2'),
    layer: 'l2',
    scope: 'project',
    projectKey: turn.projectKey,
    projectLabel: turn.projectLabel,
    importance: 8,
    createdAt: now,
    updatedAt: now,
    hash: contentHash('控制台测试使用 pnpm test。'),
    text: '控制台测试使用 pnpm test。',
    kind: 'decision',
    tags: ['test'],
    confidence: 0.9,
    revision: 1,
    source: sourceFromTurn(turn),
    sourceSessionId: turn.sessionId,
    sourceTurn: turn.turn,
  };
  store.insert(record);
  await store.flush();

  let handler;
  const fakeCtx = {
    webServer: {
      register(options) {
        handler = options.handler;
        return () => {};
      },
    },
  };
  registerConsole(fakeCtx, { store, embedder: new EmbeddingClient(config), config, logger: { warn() {} } });
  assert.equal(typeof handler, 'function');
  const server = createServer((req, res) => handler(req, res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    const stats = await (await fetch(`${base}/holo-memory/stats`)).json();
    assert.equal(stats.authority, 'dsh-holo-memory');
    assert.equal(stats.source.backed, 1);
    assert.ok(Array.isArray(stats.thresholds));

    const doctor = await (await fetch(`${base}/holo-memory/doctor?deep=1`)).json();
    assert.equal(doctor.ok, true);
    const byId = new Map(doctor.checks.map((check) => [check.id, check]));
    assert.equal(byId.get('source:open').level, 'ok');
    assert.equal(byId.get('retrieval:probe').level, 'ok');

    const opened = await (await fetch(`${base}/holo-memory/open?id=${record.id.slice(-8)}&history=1`)).json();
    assert.equal(opened.ok, true);
    assert.match(opened.text, /pnpm test/);
    assert.match(opened.text, /hash verified/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
