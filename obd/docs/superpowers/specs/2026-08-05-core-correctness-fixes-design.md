# Core Correctness Fixes — Design

Status: approved
Date: 2026-08-05
Sub-project 1 of 6 (see "Roadmap" below for the full sequence this belongs to).

## Context

A code review of the OBD2 scanner app (`/home/byron/obd`) surfaced three
correctness/robustness issues in the hardware-facing layer. This spec covers
fixing those three, and only those three — everything else from the review
(reconnect, units, freeze-frame, history, settings, DTC/UX polish, and
broader test coverage for screens/transports) is deferred to later
sub-projects.

## Roadmap (for context, not in scope here)

1. **Core correctness fixes** (this spec)
2. Reliability: auto-reconnect / remembered adapter
3. Data features: units toggle, freeze-frame, live-data history
4. Settings screen (units + custom PIDs)
5. UX polish: DTC grouping/severity, loading-vs-unsupported-PID distinction,
   manual retry
6. Test coverage for store/screens/transports (beyond what lands with each
   fix above)

## Problem 1: DTC count-byte ambiguity

`parseDtcResponse` in `src/obd/dtc.ts` decodes a Mode 03/07 payload as a
stream of byte pairs starting at index 0. Some ELM327 adapters prepend a
one-byte "number of codes" field before the pair stream. The existing code
comment acknowledges this ambiguity but the implementation doesn't handle
it — against such an adapter, every decoded code would be shifted by one
byte and be garbage.

### Fix

A valid byte-pair stream always has an even length. If
`bytes.length % 2 !== 0`, treat `bytes[0]` as a stray leading byte (count or
otherwise) and decode starting from `bytes[1]`. If the length is already
even, decode unchanged from index 0.

This is a heuristic (no real adapter sample was available to verify
against), but it's the standard defensive approach for this ambiguity and is
cheap to get right: it can't make a well-formed even-length response worse,
and it turns a silently-wrong result into a correct one for the count-byte
case.

### Tests

In `src/obd/__tests__/dtc.test.ts`:
- Existing even-length cases continue to pass unchanged.
- New case: an odd-length array (one stray leading byte + N valid pairs)
  decodes to the same codes as the equivalent un-prefixed even-length array.

## Problem 2: `ObdService` queue fragility

`ObdService` (`src/obd/ObdService.ts`) currently tracks in-flight/queued
commands across two parallel arrays: `this.queue: {command, timeoutMs}[]`
and `this.currentResolvers: {resolve, reject}[]`. `sendCommand` pushes to
`queue`; `processQueue` pushes to `currentResolvers`. They're only kept in
sync because both pushes happen synchronously within the same call today —
there's no structural guarantee, so a future change that pushes to one
without the other silently misroutes resolve/reject callbacks to the wrong
command.

### Fix

Collapse both arrays into one: `this.queue: PendingCommand[]`, where
`PendingCommand` carries `command: string`, `timeoutMs: number`,
`resolve: (raw: string) => void`, and `reject: (err: ObdError) => void`.
`sendCommand` pushes one complete entry; `drainNext` shifts one entry. The
`this.pending` in-flight slot and `this.currentResolvers` field are removed;
`processQueue`'s job (kicking off `drainNext` only if nothing is already
in flight) is preserved as-is, just operating on the single array.

### Tests

In `src/obd/__tests__/ObdService.integration.test.ts`, using the existing
fake-transport harness: queue 3 distinct commands with distinct expected
replies (via the fake transport's response mapping) without awaiting
between them, then await all three and assert each resolved with the reply
matching *its own* command, in the order sent. This is the scenario that
silently breaks if the two-array bookkeeping ever desyncs.

## Problem 3: Dashboard poll backpressure

`DashboardScreen` polls `refreshLiveData` every 1500ms via `setInterval`.
`refreshLiveData` reads all `LIVE_DASHBOARD_PIDS` (8 PIDs) sequentially,
each a full request/response round trip through `ObdService`'s serial
command queue. If a batch takes longer than the 1500ms tick (slow BLE link,
adapter latency, timeouts), the next tick fires anyway and queues another
full batch on top of the one still in flight — with no bound, the command
queue grows without limit and the UI falls progressively further behind
live data with no indication to the user.

### Fix

Add an in-flight guard in the store (`src/store/obdStore.ts`): a
module-level `refreshInFlight` boolean (colocated with the existing
module-level `manager`/`service` singletons, following the same pattern).
`refreshLiveData` checks it at the top and returns immediately (no-op) if
already `true`; otherwise sets it `true`, runs the existing batch-read
logic, and clears it in a `finally`. `DashboardScreen`'s polling interval is
unchanged (still a fixed 1500ms `setInterval`) — ticks that land while a
batch is still running become cheap no-ops instead of piling on more
queued commands.

### Tests

In a new file `src/store/__tests__/obdStore.test.ts` (mirroring the
`src/obd/__tests__/` convention used elsewhere in the repo), with
`BluetoothManager`/`ObdService` mocked: call `refreshLiveData()` twice
back-to-back without awaiting the first, then await both. Assert the underlying `service.readLiveDataBatch` (mocked) was
invoked exactly once by the time the second call returns — i.e. the second
call observed the in-flight guard and no-opped rather than issuing a second
batch.

## Non-goals

- No change to poll interval, PID set, or dashboard UI/rendering.
- No change to `ObdService`'s public API surface (`sendCommand`,
  `readPid`, etc. keep their existing signatures).
- No attempt to verify the DTC fix against real hardware — flagged as a
  known limitation, not blocking.
- No test coverage added here beyond what's needed to pin down these three
  fixes; broader store/screen/transport coverage is sub-project 6.
