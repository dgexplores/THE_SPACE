import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtAgo, opsRows, opsTotals } from '../src/client/features/ops/rows.js';
import type { WorkerInfo } from '../src/shared/protocol.js';

const worker = (id: string, more: Partial<WorkerInfo> = {}): WorkerInfo => ({
  id,
  kind: 'agent',
  deskId: `desk-${id}`,
  name: id,
  color: '#ffffff',
  status: 'working',
  acked: true,
  createdBy: 'test',
  createdAt: 0,
  cols: 80,
  rows: 24,
  viewers: [],
  viewerIds: [],
  ...more,
});

test('ops rows sort needs-you first, longest-waiting first, then done, working, idle', () => {
  const rows = opsRows([
    worker('idle', { status: 'idle' }),
    worker('working'),
    worker('new-need', { status: 'needs_input', waitingSince: 2000, acked: false }),
    worker('old-need', { status: 'needs_input', waitingSince: 1000, acked: false }),
    worker('done', { status: 'done', waitingSince: 500, acked: false }),
  ]);
  assert.deepEqual(
    rows.map((r) => r.id),
    ['old-need', 'new-need', 'done', 'working', 'idle'],
  );
  assert.equal(rows[0].seen, false);
  assert.equal(rows[3].seen, true);
});

test('ops rows fall back to shell, title and activity text', () => {
  const [shell, titled, tasked] = opsRows([
    worker('s', { kind: 'shell' }),
    worker('t', { title: 'Cleanup' }),
    worker('w', { task: { name: 'Fix x', summary: 'Editing y' }, activity: 'old line' }),
  ]);
  assert.equal(shell.task, 'Shared shell');
  assert.equal(titled.task, 'Cleanup');
  assert.equal(tasked.task, 'Fix x');
  assert.equal(tasked.detail, 'Editing y');
});

test('ops rows carry branch, PR, tokens and usable cost only', () => {
  const [a, b] = opsRows([
    worker('a', {
      worktree: { path: 'w', branch: 'office/a-1', base: 'main' },
      pr: { number: 7, url: 'https://example.test/p/7' },
      usage: { input: 1, output: 2, cacheWrite: 0, cacheRead: 0, cost: 0.5, calls: 1 },
    }),
    worker('b', { usage: { input: 1, output: 0, cacheWrite: 0, cacheRead: 0, cost: 9, calls: 0, costKnown: false } }),
  ]);
  assert.equal(a.branch, 'office/a-1');
  assert.equal(a.pr, 7);
  assert.equal(a.prUrl, 'https://example.test/p/7');
  assert.equal(a.tokens, 3);
  assert.equal(a.cost, 0.5);
  assert.equal(b.cost, undefined);
});

test('ops totals count waiting, working, tokens and cost', () => {
  const t = opsTotals(
    opsRows([
      worker('a', { status: 'needs_input', acked: false }),
      worker('b', { usage: { input: 100, output: 0, cacheWrite: 0, cacheRead: 0, cost: 0.25, calls: 1 } }),
    ]),
  );
  assert.equal(t.workers, 2);
  assert.equal(t.waiting, 1);
  assert.equal(t.working, 1);
  assert.equal(t.tokens, 100);
  assert.equal(t.cost, 0.25);
});

test('fmtAgo buckets seconds, minutes, hours and days', () => {
  const now = 1_000_000;
  assert.equal(fmtAgo(now - 12_000, now), '12s');
  assert.equal(fmtAgo(now - 5 * 60_000, now), '5m');
  assert.equal(fmtAgo(now - 3 * 3_600_000, now), '3h');
  assert.equal(fmtAgo(now - 2 * 86_400_000, now), '2d');
});
