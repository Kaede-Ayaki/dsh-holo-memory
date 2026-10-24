import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apply, name, inject, Config } from '../lib/index.js';

function fakeCtx() {
  const listeners = new Map();
  const registered = [];
  const sections = [];
  const variables = [];
  const ctx = {
    listeners,
    registered,
    sections,
    variables,
    on(event, fn) {
      const list = listeners.get(event) ?? [];
      list.push(fn);
      listeners.set(event, list);
    },
    get() {
      return undefined;
    },
    effect(fn) {
      fn();
    },
    logger: { warn() {}, info() {} },
  };
  ctx.tools = { register(tool) { registered.push(tool); } };
  ctx.systemPrompt = {
    section(section) { sections.push(section); },
    variable(name, provider) { variables.push({ name, provider }); return () => {}; },
  };
  return ctx;
}

async function emit(ctx, event, ...args) {
  for (const fn of ctx.listeners.get(event) ?? []) await fn(...args);
}

function message(role, text, sourceKind = role === 'user' ? 'user' : 'model') {
  return {
    id: `${role}-${Math.random().toString(16).slice(2)}`,
    role,
    content: [{ type: 'text', text }],
    source: sourceKind === 'model' ? { kind: 'model', provider: 'p', model: 'm' } : { kind: sourceKind },
  };
}

async function waitForFile(file, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

test('plugin exports the Loader contract', () => {
  assert.equal(name, 'holo-memory');
  assert.deepEqual(inject, ['tools', 'systemPrompt']);
  assert.ok(Config);
  assert.equal(typeof apply, 'function');
});

test('apply registers tools, guidance section and lifecycle listeners', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-plugin-'));
  const ctx = fakeCtx();
  apply(ctx, {
    storageDir: dir,
    extractMinTurnChars: 1,
    extractEnabled: true,
    injectEnabled: true,
  });
  assert.equal(ctx.registered.length, 8, 'eight model-facing tools are registered');
  assert.deepEqual(
    ctx.registered.map((tool) => tool.name).sort(),
    [
      'memory_doctor',
      'memory_forget',
      'memory_injections',
      'memory_list',
      'memory_note',
      'memory_open',
      'memory_recall',
      'memory_stats',
    ],
  );
  assert.equal(ctx.sections.length, 1);
  assert.equal(ctx.sections[0].name, 'holo-memory:guidance');
  const cwdVariable = ctx.variables.find((variable) => variable.name === 'cwd');
  assert.ok(cwdVariable, 'registers a cwd compatibility variable for legacy presets');
  assert.equal(cwdVariable.provider({ agent: { session: { header: { cwd: 'D:\\work\\demo' } } } }), 'D:\\work\\demo');
  for (const event of ['session/event', 'agent/created', 'agent/disposed', 'session/disposed', 'agent/pre-step']) {
    assert.ok((ctx.listeners.get(event) ?? []).length > 0, `${event} listener registered`);
  }
  await fs.rm(dir, { recursive: true, force: true });
});

test('a completed turn is distilled into L1 and injected on the next turn', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-plugin-'));
  const ctx = fakeCtx();
  apply(ctx, {
    storageDir: dir,
    extractMinTurnChars: 1,
    extractEnabled: true,
    injectEnabled: true,
    injectMaxChars: 800,
  });
  const session = { id: 's-1', header: { cwd: 'D:\\work\\demo', delegationDepth: 0 } };
  const user = message('user', '记住：这个项目用 pnpm，测试命令是 pnpm test。');
  const assistant = message('assistant', '好的，已记住。这个项目使用 pnpm，测试命令是 pnpm test。');
  await emit(ctx, 'session/event', session, { type: 'turn/start', data: { turn: 1 } });
  await emit(ctx, 'session/event', session, { type: 'user/message', data: user });
  await emit(ctx, 'session/event', session, { type: 'assistant/message', data: { message: assistant } });
  await emit(ctx, 'session/event', session, { type: 'turn/end', data: { turn: 1, reason: { kind: 'complete' } } });

  const l1 = await waitForFile(path.join(dir, 'l1.json'));
  assert.ok(l1, 'L1 record was persisted');
  assert.match(l1[0].summary, /pnpm/);

  const nextUser = message('user', '继续');
  const decision = { kind: 'enter', messages: [nextUser] };
  const results = [];
  for (const listener of ctx.listeners.get('agent/pre-step') ?? []) {
    results.push(await listener({ agent: { session }, messages: [nextUser], signal: undefined }, async () => decision));
  }
  const injectedDecision = results.at(-1);
  const injected = injectedDecision.messages.at(-1);
  assert.equal(injected.source.kind, 'holo-memory');
  assert.match(injected.content[0].text, /长期记忆自动召回/);
  await fs.rm(dir, { recursive: true, force: true });
});


