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

test('client half registers a top-level panel and sidebar entry', () => {
  const mod = loadClient();
  assert.equal(mod.name, 'dsh-holo-memory');
  assert.equal(mod.inject.length, 1);
  assert.equal(mod.inject[0], 'slots');
  assert.equal(typeof mod.apply, 'function');

  const registrations = [];
  const injectedSlots = [];
  const ctx = {
    slots: {
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
  assert.deepEqual(injectedSlots, ['main', 'sidebar.panellist']);
  assert.equal(registrations.length, 2);

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
});
