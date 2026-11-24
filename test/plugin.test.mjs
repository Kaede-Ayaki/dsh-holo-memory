import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apply, name, inject, Config } from '../lib/index.js';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';

function fakeCtx() {
  const listeners = new Map();
  const registered = [];
  const sections = [];
  const variables = [];
  const provided = {};
  const ctx = {
    listeners,
    registered,
    sections,
    variables,
    provided,
    on(event, fn) {
      const list = listeners.get(event) ?? [];
      list.push(fn);
      listeners.set(event, list);
    },
    get() {
      return undefined;
    },
    provide(name, value) {
      provided[name] = value;
      return () => {};
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
  assert.equal(ctx.registered.length, 12, 'twelve model-facing tools are registered');
  assert.deepEqual(
    ctx.registered.map((tool) => tool.name).sort(),
    [
      'memory_doctor',
      'memory_forget',
      'memory_injections',
      'memory_list',
      'memory_maintenance',
      'memory_note',
      'memory_open',
      'memory_profile',
      'memory_recall',
      'memory_stats',
      'memory_supersede',
      'memory_timeline',
    ],
  );
  assert.equal(ctx.sections.length, 1);
  assert.equal(ctx.sections[0].name, 'holo-memory:guidance');
  assert.ok(ctx.provided.holoMemory, 'provides read-only holoMemory service');
  assert.equal(typeof ctx.provided.holoMemory.listRecords, 'function');
  const cwdVariable = ctx.variables.find((variable) => variable.name === 'cwd');
  assert.ok(cwdVariable, 'registers a cwd compatibility variable for legacy presets');
  assert.equal(cwdVariable.provider({ agent: { session: { header: { cwd: 'D:\\work\\demo' } } } }), 'D:\\work\\demo');
  for (const event of ['session/event', 'agent/created', 'agent/disposed', 'session/disposed', 'agent/pre-step']) {
    assert.ok((ctx.listeners.get(event) ?? []).length > 0, `${event} listener registered`);
  }
  await fs.rm(dir, { recursive: true, force: true });
});

test('holo pre-step consumes neuronMemory.expand as an associative channel', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-neuron-'));
  const ctx = fakeCtx();
  apply(ctx, {
    storageDir: dir,
    extractMinTurnChars: 1,
    extractEnabled: true,
    injectEnabled: true,
    activeWindowEnabled: false,
    injectMaxChars: 800,
  });
  const session = { id: 's-neuron', header: { cwd: 'D:\\work\\demo', delegationDepth: 0 } };
  const user = message('user', '记住：这个项目用 pnpm，测试命令是 pnpm test。');
  const assistant = message('assistant', '好的，已记住。这个项目使用 pnpm，测试命令是 pnpm test。');
  await emit(ctx, 'session/event', session, { type: 'turn/start', data: { turn: 1 } });
  await emit(ctx, 'session/event', session, { type: 'user/message', data: user });
  await emit(ctx, 'session/event', session, { type: 'assistant/message', data: { message: assistant } });
  await emit(ctx, 'session/event', session, { type: 'turn/end', data: { turn: 1, reason: { kind: 'complete' } } });
  const l1 = await waitForFile(path.join(dir, 'l1.json'));
  assert.ok(l1);

  const feedbackCalls = [];
  ctx.get = (name) =>
    name === 'neuronMemory'
      ? {
          expand: async () => ({ hits: [{ holoId: l1[0].id, activation: 0.9, layer: 'l1' }] }),
          feedback: (event) => {
            feedbackCalls.push(event);
          },
        }
      : undefined;
  await emit(ctx, 'session/event', session, { type: 'turn/start', data: { turn: 2 } });
  const nextUser = message('user', '完全不相关的天气问题请随便回答一下');
  const decision = { kind: 'enter', messages: [nextUser] };
  const results = [];
  for (const listener of ctx.listeners.get('agent/pre-step') ?? []) {
    results.push(await listener({ agent: { session }, messages: [nextUser], signal: undefined }, async () => decision));
  }
  const injected = results.at(-1).messages.at(-1);
  assert.equal(injected.source.kind, 'holo-memory');
  assert.ok(injected.source.selected.some((item) => item.channels.includes('neuron')));
  assert.match(injected.content[0].text, /pnpm/);

  await emit(ctx, 'session/event', session, {
    type: 'assistant/message',
    data: { message: message('assistant', `已记录，引用记忆 ${l1[0].id.slice(-8)}。`) },
  });
  await emit(ctx, 'session/event', session, { type: 'turn/end', data: { turn: 2, reason: { kind: 'complete' } } });
  assert.ok(feedbackCalls.some((event) => event.citedIds.includes(l1[0].id)), 'neuron feedback receives cited holo id');
  await fs.rm(dir, { recursive: true, force: true });
});

test('user-profile profile is injected even when query recall is empty', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-profile-inject-'));
  await fs.writeFile(
    path.join(dir, 'a.json'),
    JSON.stringify({
      profile: {
        id: 'a_user_profile',
        title: '用户画像 · 偏好/习惯/人格',
        summary: '用户偏好先给结论，再给细节。',
        preferences: ['先给结论', '中文回答'],
        habits: ['动手前先确认代码现状'],
        personality: ['直接、务实'],
        workingStyle: ['简洁'],
        confirmFor: ['公开发布', '付费'],
        autoApply: true,
        evidenceIds: [],
        importance: 9,
        createdAt: 1,
        updatedAt: 1,
        revision: 1,
      },
    }),
    'utf8',
  );
  const ctx = fakeCtx();
  apply(ctx, {
    storageDir: dir,
    extractEnabled: false,
    injectEnabled: true,
    activeWindowEnabled: false,
  });
  const session = { id: 's-profile', header: { cwd: 'D:\\work\\demo', delegationDepth: 0 } };
  const user = message('user', '帮我搭一个完全新的小型工具。');
  const decision = { kind: 'enter', messages: [user] };
  const results = [];
  for (const listener of ctx.listeners.get('agent/pre-step') ?? []) {
    results.push(await listener({ agent: { session }, messages: [user], signal: undefined }, async () => decision));
  }
  const injected = results.at(-1).messages.at(-1);
  assert.equal(injected.source.kind, 'holo-memory');
  assert.match(injected.content[0].text, /\[用户画像 · 偏好\/习惯\/人格\]/);
  assert.match(injected.content[0].text, /先给结论/);
  assert.match(injected.content[0].text, /重要.*询问|必须先询问/);
  assert.equal(injected.source.a, 1);
  await fs.rm(dir, { recursive: true, force: true });
});

test('runtime switches block automatic read and write independently', async () => {
  const seedReadMemory = async (dir) => {
    const store = new HoloStore(dir, normalizeConfig({}));
    await store.whenReady();
    const project = projectIdFor('D:\\work\\demo');
    const now = Date.now();
    const record = {
      id: newId('l1'),
      layer: 'l1',
      scope: 'project',
      projectKey: project.key,
      projectLabel: project.label,
      importance: 5,
      createdAt: now,
      updatedAt: now,
      hash: contentHash('deploy'),
      sessionId: 's-seed',
      turn: 1,
      cwd: 'D:\\work\\demo',
      summary: '这个项目部署到 Windows 的测试命令是 pnpm test。',
      topics: ['deploy', 'test'],
    };
    store.insert(record);
    await store.flush();
    return record;
  };

  const readDir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-toggle-read-'));
  await seedReadMemory(readDir);
  await fs.writeFile(
    path.join(readDir, 'runtime-toggles.json'),
    JSON.stringify({ read: false, write: true, updatedAt: Date.now() }),
    'utf8',
  );
  const readCtx = fakeCtx();
  apply(readCtx, { storageDir: readDir, extractMinTurnChars: 1, injectEnabled: true, injectMaxChars: 800 });
  const readSession = { id: 's-read-off', header: { cwd: 'D:\\work\\demo', delegationDepth: 0 } };
  const readUser = message('user', '这个项目部署到 Windows 的测试命令是什么？');
  const readDecision = { kind: 'enter', messages: [readUser] };
  const readResults = [];
  for (const listener of readCtx.listeners.get('agent/pre-step') ?? []) {
    readResults.push(await listener({ agent: { session: readSession }, messages: [readUser], signal: undefined }, async () => readDecision));
  }
  assert.equal(readResults.at(-1).messages.length, readDecision.messages.length, 'read switch off: no memory message');
  await fs.rm(readDir, { recursive: true, force: true });

  const readOnDir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-toggle-read-on-'));
  await seedReadMemory(readOnDir);
  const readOnCtx = fakeCtx();
  apply(readOnCtx, { storageDir: readOnDir, extractMinTurnChars: 1, injectEnabled: true, injectMaxChars: 800 });
  const readOnUser = message('user', '这个项目部署到 Windows 的测试命令是什么？');
  const readOnDecision = { kind: 'enter', messages: [readOnUser] };
  const readOnResults = [];
  for (const listener of readOnCtx.listeners.get('agent/pre-step') ?? []) {
    readOnResults.push(await listener({ agent: { session: { id: 's-read-on', header: { cwd: 'D:\\work\\demo', delegationDepth: 0 } } }, messages: [readOnUser], signal: undefined }, async () => readOnDecision));
  }
  assert.equal(readOnResults.at(-1).messages.at(-1).source.kind, 'holo-memory', 'read switch on: memory injected');
  await fs.rm(readOnDir, { recursive: true, force: true });

  const writeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-toggle-write-'));
  await fs.writeFile(
    path.join(writeDir, 'runtime-toggles.json'),
    JSON.stringify({ read: true, write: false, updatedAt: Date.now() }),
    'utf8',
  );
  const writeCtx = fakeCtx();
  apply(writeCtx, { storageDir: writeDir, extractMinTurnChars: 1, extractEnabled: true, injectEnabled: true });
  const writeSession = { id: 's-write-off', header: { cwd: 'D:\\work\\demo', delegationDepth: 0 } };
  await emit(writeCtx, 'session/event', writeSession, { type: 'turn/start', data: { turn: 1 } });
  await emit(writeCtx, 'session/event', writeSession, { type: 'user/message', data: message('user', '记住：这个项目用 pnpm。') });
  await emit(writeCtx, 'session/event', writeSession, {
    type: 'assistant/message',
    data: { message: message('assistant', '好的。') },
  });
  await emit(writeCtx, 'session/event', writeSession, { type: 'turn/end', data: { turn: 1, reason: { kind: 'complete' } } });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const writeL1 = await fs.readFile(path.join(writeDir, 'l1.json'), 'utf8').catch(() => null);
  assert.equal(writeL1, null, 'write switch off: no L1 persisted');
  await fs.rm(writeDir, { recursive: true, force: true });
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


