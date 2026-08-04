# Core Correctness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three correctness/robustness bugs in the OBD2 scanner's hardware-facing layer: DTC decoding misaligns on adapters that prepend a count byte, `ObdService`'s command queue relies on two arrays staying manually in sync, and the dashboard's live-data poll has no backpressure and can queue commands without bound.

**Architecture:** No new modules. Each fix is a small, targeted change to an existing file (`src/obd/dtc.ts`, `src/obd/ObdService.ts`, `src/store/obdStore.ts`), each with a regression test that fails before the fix and passes after. Fixes are independent of each other and can be done in any order; this plan does them in ascending file-size/risk order.

**Tech Stack:** TypeScript, Jest (`@react-native/jest-preset`), Zustand.

## Global Constraints

- No change to any public function signature, PID set, or UI behavior beyond what's described per-task.
- Every new/changed behavior ships with a test in the same commit as the fix (per the design spec).
- Follow existing test conventions: fixture-style fakes over mocking libraries where the codebase already does that (see `FakeElm327Transport` in `src/obd/__tests__/ObdService.integration.test.ts`); `jest.mock()` + manual class auto-mock where the codebase does that (see `jest.setup.js`).
- Run `npx jest` after every task and confirm the full suite (not just the new test) is green before committing.

---

### Task 1: DTC count-byte fix

**Files:**
- Modify: `src/obd/dtc.ts:33-55` (`parseDtcResponse`)
- Test: `src/obd/__tests__/dtc.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `parseDtcResponse(bytes: number[], status: 'stored' | 'pending'): DiagnosticTroubleCode[]` — signature unchanged, behavior changed only for odd-length `bytes`.

- [ ] **Step 1: Write the failing test**

Add to the `describe('parseDtcResponse', ...)` block in `src/obd/__tests__/dtc.test.ts` (after the existing `'parses multiple codes and attaches known descriptions'` test):

```ts
  it('drops a stray leading count byte when the payload length is odd', () => {
    // Same P0301/P0420 pair as the even-length case above, but with one
    // extra leading byte (as some adapters send a "number of codes" byte
    // before the pair stream) making the total length odd.
    const withCountByte = parseDtcResponse([0x02, 0x03, 0x01, 0x04, 0x20], 'stored');
    const withoutCountByte = parseDtcResponse([0x03, 0x01, 0x04, 0x20], 'stored');
    expect(withCountByte).toEqual(withoutCountByte);
    expect(withCountByte.map((c) => c.code)).toEqual(['P0301', 'P0420']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/obd/__tests__/dtc.test.ts -t "drops a stray leading count byte"`
Expected: FAIL. With the current implementation, `[0x02, 0x03, 0x01, 0x04, 0x20]` decodes pairwise from index 0 as `(0x02,0x03)` and `(0x01,0x04)` with `0x20` left over unpaired — producing codes that don't match `['P0301', 'P0420']`.

- [ ] **Step 3: Write minimal implementation**

In `src/obd/dtc.ts`, inside `parseDtcResponse`, before the existing `for` loop:

```ts
export function parseDtcResponse(
  bytes: number[],
  status: 'stored' | 'pending',
): DiagnosticTroubleCode[] {
  const codes: DiagnosticTroubleCode[] = [];
  // A well-formed byte-pair stream always has an even length. Some adapters
  // prepend a one-byte "number of codes" field before the pair stream; an
  // odd total length is the signal that byte is present, so drop it before
  // pairing rather than letting it desync every subsequent pair.
  const pairBytes = bytes.length % 2 !== 0 ? bytes.slice(1) : bytes;
  for (let i = 0; i + 1 < pairBytes.length; i += 2) {
    const a = pairBytes[i];
    const b = pairBytes[i + 1];
    const code = decodeDtcBytes(a, b);
    if (code) {
      codes.push({
        code,
        description: describeDtc(code),
        status,
        raw: `${a.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
      });
    }
  }
  return codes;
}
```

This replaces the existing loop body's use of `bytes` with `pairBytes`; the loop structure and body are otherwise unchanged. Update the docstring comment above the function (currently describing the ambiguity as unhandled) to reflect that it's now handled — replace the comment's second sentence with: "An odd-length payload is treated as having a stray leading byte (e.g. a count byte), which is dropped before pairing."

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/obd/__tests__/dtc.test.ts -v`
Expected: PASS, all tests in the file including the new one and the pre-existing even-length cases.

- [ ] **Step 5: Commit**

```bash
git add src/obd/dtc.ts src/obd/__tests__/dtc.test.ts
git commit -m "fix: drop stray leading count byte in DTC decoding

Some ELM327 adapters prepend a one-byte code count before the DTC
byte-pair stream, which previously desynced every pair. An odd total
length is now treated as the signal that byte is present."
```

---

### Task 2: `ObdService` single-array command queue

**Files:**
- Modify: `src/obd/ObdService.ts:10-14, 22-30, 137-186` (types, fields, `sendCommand`/`processQueue`/`drainNext`)
- Test: `src/obd/__tests__/ObdService.integration.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: no public API change — `sendCommand`, `readPid`, `readLiveDataBatch`, `readStoredDtcs`, `readPendingDtcs`, `clearDtcs`, `readVin` all keep their existing signatures and behavior. Internal-only refactor.

- [ ] **Step 1: Write the failing test**

Add to `src/obd/__tests__/ObdService.integration.test.ts`, first extend `FakeElm327Transport.replyFor` (in the same file) with one more case so three distinct PIDs have three distinct, verifiable replies — add this `case` inside the existing `switch` in `replyFor`, right after the `'010D'` case:

```ts
      case '0105':
        return '41 05 5A'; // Coolant temp = 90 - 40 = 50
```

Then add a new test in the `describe('ObdService integration', ...)` block, after the existing `'serializes commands sent back-to-back through the single-in-flight queue'` test:

```ts
  it('resolves each of three back-to-back commands with its own matching reply', async () => {
    const transport = new FakeElm327Transport();
    const service = new ObdService();
    await service.attach(transport);

    const [rpm, speed, coolant] = await Promise.all([
      service.readPid('0C'),
      service.readPid('0D'),
      service.readPid('05'),
    ]);

    expect(rpm).toMatchObject({ pid: '0C', value: 1726 });
    expect(speed).toMatchObject({ pid: '0D', value: 90 });
    expect(coolant).toMatchObject({ pid: '05', value: 50 });
    expect(transport.sentCommands).toEqual(['010C', '010D', '0105']);
  });
```

This test would already pass against the current two-array implementation (since both arrays are pushed synchronously in the same call today) — it's a regression guard for the refactor in this task, not a bug reproduction. It must still pass after Step 3.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/obd/__tests__/ObdService.integration.test.ts -t "resolves each of three back-to-back commands"`
Expected: PASS already (this confirms the new fixture case and test are wired correctly before refactoring — there is no bug to reproduce here, only a regression guard to put in place first). Confirm it passes now so you know any future failure is due to the refactor, not a typo in the test itself.

- [ ] **Step 3: Write minimal implementation**

In `src/obd/ObdService.ts`, replace the `PendingCommand` interface and the queue-related fields/methods:

Replace lines 10-14:
```ts
interface PendingCommand {
  resolve: (raw: string) => void;
  reject: (err: ObdError) => void;
  timer: ReturnType<typeof setTimeout>;
}
```
with:
```ts
interface QueuedCommand {
  command: string;
  timeoutMs: number;
  resolve: (raw: string) => void;
  reject: (err: ObdError) => void;
}

interface InFlightCommand {
  resolve: (raw: string) => void;
  reject: (err: ObdError) => void;
  timer: ReturnType<typeof setTimeout>;
}
```

Replace the field declarations (originally lines 24-26):
```ts
  private transport: BluetoothTransport | null = null;
  private buffer = '';
  private pending: PendingCommand | null = null;
  private queue: Array<{ command: string; timeoutMs: number }> = [];
```
with:
```ts
  private transport: BluetoothTransport | null = null;
  private buffer = '';
  private pending: InFlightCommand | null = null;
  private queue: QueuedCommand[] = [];
```

Replace `sendCommand` through `drainNext` (originally lines 137-186) with:

```ts
  private sendCommand(command: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
    if (!this.transport?.isConnected()) {
      return Promise.reject<string>({
        code: 'CONNECTION_LOST',
        message: 'No active connection',
      } satisfies ObdError);
    }
    return new Promise<string>((resolve, reject) => {
      this.queue.push({ command, timeoutMs, resolve, reject });
      if (!this.pending) this.drainNext();
    });
  }

  private drainNext(): void {
    const next = this.queue.shift();
    if (!next) return;
    this.buffer = '';
    this.pending = {
      resolve: next.resolve,
      reject: next.reject,
      timer: setTimeout(() => {
        this.pending = null;
        next.reject({ code: 'TIMEOUT', message: `Command "${next.command}" timed out` });
        this.drainNext();
      }, next.timeoutMs),
    };
    this.transport!.write(next.command).catch((e) => {
      if (!this.pending) return;
      clearTimeout(this.pending.timer);
      this.pending = null;
      next.reject({
        code: 'CONNECTION_LOST',
        message: 'Failed to write command',
        raw: String(e),
      });
      this.drainNext();
    });
  }
```

Note this removes `processQueue` and `currentResolvers` entirely — `sendCommand` now does what `processQueue` did (decide whether to kick off `drainNext`), and `drainNext` pulls `resolve`/`reject` directly off the single `QueuedCommand` entry instead of a separate resolver array.

Finally, in `failPending`, the line `this.currentResolvers.forEach((r) => r.reject(err)); this.currentResolvers = [];` becomes:
```ts
    this.queue.forEach((q) => q.reject(err));
    this.queue = [];
```
(replacing the old `this.queue = [];` line in that method, which previously cleared the queue without rejecting the promises tied to still-queued commands — this is a small correctness improvement that falls naturally out of the merge: previously, `queue` and `currentResolvers` held these together, and `failPending` only rejected `currentResolvers`, leaving `queue`'s commands orphaned since their resolvers were still tracked in `currentResolvers`. In the single-array world, `queue` and its resolvers are the same list, so rejecting it is both correct and necessary — otherwise queued commands would hang forever after a disconnect.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/obd/__tests__/ObdService.integration.test.ts -v`
Expected: PASS, all tests in the file, including the new one and all pre-existing ones (init sequence, single PID read, batch with per-PID failure isolation, DTC read, clear, VIN read, disconnect-rejects-pending, timeout, back-to-back serialization).

Also run the full suite to make sure nothing elsewhere broke:

Run: `npx jest`
Expected: PASS, all suites.

- [ ] **Step 5: Commit**

```bash
git add src/obd/ObdService.ts src/obd/__tests__/ObdService.integration.test.ts
git commit -m "refactor: merge ObdService's two parallel queue arrays into one

this.queue and this.currentResolvers were only kept in sync because
both were pushed to synchronously in the same call; a single
QueuedCommand[] removes that implicit coupling. Also fixes a latent
bug this surfaced: failPending only rejected currentResolvers, so
commands still sitting in queue at disconnect time were orphaned
rather than rejected."
```

---

### Task 3: Dashboard poll backpressure

**Files:**
- Modify: `src/store/obdStore.ts:34-36, 89-98` (module-level state, `refreshLiveData`)
- Test: `src/store/__tests__/obdStore.test.ts` (new file)

**Interfaces:**
- Consumes: `service.readLiveDataBatch(): Promise<{ samples: LiveDataSample[]; errors: ... }>` (existing, from `ObdService`, exposed on store state as `service`).
- Produces: `refreshLiveData(): Promise<void>` — signature unchanged; now a no-op (resolves immediately without calling `service.readLiveDataBatch`) if a previous call is still in flight.

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/obdStore.test.ts`:

```ts
jest.mock('../../obd/ObdService');

import { useObdStore } from '../obdStore';

describe('obdStore refreshLiveData backpressure', () => {
  it('no-ops a second call while the first is still in flight', async () => {
    const { service } = useObdStore.getState();
    let resolveBatch!: (value: { samples: never[]; errors: never[] }) => void;
    const pending = new Promise<{ samples: never[]; errors: never[] }>((resolve) => {
      resolveBatch = resolve;
    });
    (service.readLiveDataBatch as jest.Mock).mockReturnValue(pending);

    const first = useObdStore.getState().refreshLiveData();
    const second = useObdStore.getState().refreshLiveData();

    expect(service.readLiveDataBatch).toHaveBeenCalledTimes(1);

    resolveBatch({ samples: [], errors: [] });
    await Promise.all([first, second]);

    expect(service.readLiveDataBatch).toHaveBeenCalledTimes(1);
  });

  it('allows a new call to run once the previous one finished', async () => {
    const { service } = useObdStore.getState();
    (service.readLiveDataBatch as jest.Mock).mockResolvedValue({ samples: [], errors: [] });

    await useObdStore.getState().refreshLiveData();
    await useObdStore.getState().refreshLiveData();

    expect(service.readLiveDataBatch).toHaveBeenCalledTimes(2);
  });
});
```

`jest.mock('../../obd/ObdService')` auto-mocks the class so `service.readLiveDataBatch` is a `jest.fn()` we can control per-test; `service` itself is the real singleton instance created inside `obdStore.ts`, exposed via the store's `service` state field.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/store/__tests__/obdStore.test.ts -v`
Expected: FAIL on the first test (`no-ops a second call while the first is still in flight`) with `readLiveDataBatch` called 2 times instead of 1, since `refreshLiveData` currently has no in-flight guard. The second test should already pass (sequential awaited calls always call through) — that's expected and confirms the fixture itself is wired correctly.

- [ ] **Step 3: Write minimal implementation**

In `src/store/obdStore.ts`, add a module-level flag next to the existing `manager`/`service` singletons (originally lines 34-35):

```ts
const manager = new BluetoothManager();
const service = new ObdService();
let refreshInFlight = false;
```

Replace the `refreshLiveData` implementation (originally lines 89-98):

```ts
  refreshLiveData: async () => {
    const { samples } = await service.readLiveDataBatch();
    set((s) => {
      const next = { ...s.liveData };
      samples.forEach((sample) => {
        next[sample.pid] = sample;
      });
      return { liveData: next };
    });
  },
```

with:

```ts
  refreshLiveData: async () => {
    if (refreshInFlight) return;
    refreshInFlight = true;
    try {
      const { samples } = await service.readLiveDataBatch();
      set((s) => {
        const next = { ...s.liveData };
        samples.forEach((sample) => {
          next[sample.pid] = sample;
        });
        return { liveData: next };
      });
    } finally {
      refreshInFlight = false;
    }
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/store/__tests__/obdStore.test.ts -v`
Expected: PASS, both tests.

Also run the full suite:

Run: `npx jest`
Expected: PASS, all suites (4 pre-existing + the 1 new store suite).

- [ ] **Step 5: Commit**

```bash
git add src/store/obdStore.ts src/store/__tests__/obdStore.test.ts
git commit -m "fix: guard refreshLiveData against overlapping polls

DashboardScreen polls refreshLiveData every 1500ms regardless of
whether the previous batch finished. Over a slow link a batch can
exceed the poll interval, and with no guard the ObdService command
queue would grow without bound. A module-level in-flight flag makes
overlapping ticks no-ops instead."
```

---

## Self-Review Notes

- **Spec coverage:** Problem 1 (DTC count-byte) → Task 1. Problem 2 (queue fragility) → Task 2. Problem 3 (poll backpressure) → Task 3. All three spec problems and their prescribed tests are covered; no spec section is unaddressed.
- **Placeholder scan:** no TBD/TODO markers; every step has literal code, not a description of code.
- **Type consistency:** `QueuedCommand`/`InFlightCommand` names and fields in Task 2 are used consistently within that task (no later task references `PendingCommand`, so no stale-name risk). `refreshInFlight` is only referenced within Task 3. `parseDtcResponse`'s signature is unchanged and not referenced elsewhere in this plan.
