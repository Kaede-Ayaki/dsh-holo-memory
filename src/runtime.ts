/**
 * Runtime read/write switches for automatic holo-memory behavior.
 *
 * The switches are deliberately server-owned: the pre-step injection and the
 * turn-end extraction run in the Host process, so a browser-only localStorage
 * flag would be a fake control. The small state file survives restarts and is
 * read once at plugin activation.
 */
import { readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';

export interface RuntimeToggleState {
  /** Automatic recall injection at agent/pre-step. */
  read: boolean;
  /** Automatic L1/L2/L3 capture, feedback and manual writes. */
  write: boolean;
  updatedAt: number;
}

const FILE = 'runtime-toggles.json';

function parse(raw: string): RuntimeToggleState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeToggleState>;
    if (typeof parsed.read !== 'boolean' || typeof parsed.write !== 'boolean') return null;
    return {
      read: parsed.read,
      write: parsed.write,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export class RuntimeToggles {
  readonly dir: string;
  private state: RuntimeToggleState = { read: true, write: true, updatedAt: 0 };
  private writeChain: Promise<void> = Promise.resolve();

  constructor(dir: string) {
    this.dir = path.resolve(dir);
    try {
      const loaded = parse(readFileSync(path.join(this.dir, FILE), 'utf8'));
      if (loaded) this.state = loaded;
    } catch {
      // Missing/corrupt state means the safe default: both switches on.
    }
  }

  get(): RuntimeToggleState {
    return { ...this.state };
  }

  private file(): string {
    return path.join(this.dir, FILE);
  }

  async set(patch: Partial<Pick<RuntimeToggleState, 'read' | 'write'>>): Promise<RuntimeToggleState> {
    const next: RuntimeToggleState = {
      read: typeof patch.read === 'boolean' ? patch.read : this.state.read,
      write: typeof patch.write === 'boolean' ? patch.write : this.state.write,
      updatedAt: Date.now(),
    };
    const write = this.writeChain
      .catch(() => undefined)
      .then(async () => {
        await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
        await writeFileAtomic(this.file(), `${JSON.stringify(next, null, 2)}\n`, {
          mode: 0o600,
          dirMode: 0o700,
        });
      });
    this.writeChain = write.then(
      () => undefined,
      () => undefined,
    );
    await write;
    this.state = next;
    return this.get();
  }
}
