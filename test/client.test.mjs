import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadClient() {
  const code = readFileSync(new URL('../client/client.js', import.meta.url), 'utf8');
  let factory;
  const window = {
    __ModuleLoader__: {
      load(options) {
        factory = options.factory;
      },
    },
  };
  const document = {
    getElementById: () => null,
    createElement: () => ({ id: '', textContent: '' }),
    head: { appendChild: () => {} },
  };
  const sandbox = { window, document, console, fetch: async () => { throw new Error('offline'); } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'client/client.js' });
  assert.equal(typeof factory, 'function', 'ModuleLoader factory registered');
  const mod = factory((name) => {
    if (name === 'react') return {};
    throw new Error(`unexpected require(${name})`);
  });
  return mod;
}

test('client half registers side panel, sidebar entry and context renderer', () => {
  const mod = loadClient();
  assert.equal(mod.name, 'dsh-holo-memory');
  assert.equal(mod.inject.length, 1);
  assert.equal(mod.inject[0], 'slots');
  assert.equal(typeof mod.apply, 'function');

  const registrations = [];
  const injectedSlots = [];
  const originalContext = function ShippedContext() {};
  const ctx = {
    slots: {
      entries(name) {
        assert.equal(name, 'conversation.chat.node');
        return [{ options: { key: 'context' }, component: originalContext }];
      },
      inject(name, callback) {
        injectedSlots.push(name);
        callback();
      },
      register(definition, component) {
        registrations.push({ definition, component });
      },
    },
  };
  mod.apply(ctx);
  assert.equal(injectedSlots.length, 3);
  assert.equal(injectedSlots[0], 'conversation.chat.node');
  assert.equal(injectedSlots[1], 'main');
  assert.equal(injectedSlots[2], 'sidebar.panellist');
  assert.equal(registrations.length, 3);

  const main = registrations.find((item) => item.definition.name === 'main');
  assert.ok(main);
  assert.equal(main.definition.key, 'holo-memory');
  assert.equal(typeof main.component, 'function');

  const sidebar = registrations.find((item) => item.definition.name === 'sidebar.panellist');
  assert.ok(sidebar);
  assert.equal(sidebar.definition.id, 'holo-memory');
  assert.equal(sidebar.definition.label, '全息记忆');
  assert.equal(sidebar.definition.order, 10);
  assert.equal(typeof sidebar.component, 'function');

  const node = registrations.find((item) => item.definition.name === 'conversation.chat.node');
  assert.ok(node);
  assert.equal(node.definition.key, 'context');
  assert.equal(typeof node.component, 'function');
  assert.notEqual(node.component, originalContext);
});
