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

test('client half registers the settings console slot', () => {
  const mod = loadClient();
  assert.equal(mod.name, 'dsh-holo-memory');
  assert.equal(mod.inject.length, 1);
  assert.equal(mod.inject[0], 'slots');
  assert.equal(typeof mod.apply, 'function');

  const registrations = [];
  let injectedSlot = '';
  const ctx = {
    slots: {
      inject(name, callback) {
        injectedSlot = name;
        callback();
      },
      register(definition, component) {
        registrations.push({ definition, component });
      },
    },
  };
  mod.apply(ctx);
  assert.equal(injectedSlot, 'settings.section');
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].definition.label, '全息记忆');
  assert.equal(registrations[0].definition.id, 'holo-memory');
  assert.equal(typeof registrations[0].component, 'function');
});
