import { hardwareLink } from './useHardwareLink.js';
import { buildRequest, parseResponse } from '../lib/pids.js';

/**
 * Polls a set of PIDs on an interval, decodes responses, and invokes onUpdate(pid, reading).
 * Returns a controller with start()/stop().
 */
export function useOBDPoll(pids, onUpdate, intervalMs = 250) {
  let timer = null;
  let index = 0;

  function onData(e) {
    const line = e.detail.line;
    const bytes = line.trim().split(/\s+/);
    if (bytes[0]?.toUpperCase() !== '41') return;
    const pid = `01${bytes[1]?.toUpperCase()}`;
    const reading = parseResponse(pid, line);
    if (reading) onUpdate(pid, reading);
  }

  function tick() {
    const pid = pids[index % pids.length];
    index += 1;
    hardwareLink.send(buildRequest(pid)).catch(() => {});
  }

  return {
    start() {
      hardwareLink.addEventListener('data', onData);
      timer = setInterval(tick, intervalMs);
      tick();
    },
    stop() {
      hardwareLink.removeEventListener('data', onData);
      if (timer) clearInterval(timer);
    },
  };
}
