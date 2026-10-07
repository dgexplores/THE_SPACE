// Who's on what, for the 📊 Ops board, its dock window and later the 2D view: one row per
// worker, needs-you first. Pure, so tests/ops.test.ts reads it under node.
import { fmtCost, fmtTokens, tokensOf, type WorkerInfo, type WorkerStatus } from '../../../shared/protocol';

export interface OpsRow {
  id: string;
  name: string;
  color: string;
  status: WorkerStatus;
  /** False while a done / needs_input worker waits for someone to look at it. */
  seen: boolean;
  /** "Fix Login Redirect": task name, shell, title, or a fallback. */
  task: string;
  /** One line under it: the summary, the latest activity, or nothing. */
  detail: string;
  branch?: string;
  pr?: number;
  prUrl?: string;
  tokens?: number;
  /** USD, when the provider's pricing is usable. */
  cost?: number;
  /** When it last went to done or needs_input (ms), so the longest-waiting sorts first. */
  waitingSince?: number;
  provider?: string;
  model?: string;
}

const ORDER: Record<WorkerStatus, number> = {
  needs_input: 0,
  done: 1,
  working: 2,
  starting: 3,
  idle: 4,
  exited: 5,
  offline: 5,
};

export function opsRows(workers: Iterable<WorkerInfo>): OpsRow[] {
  const rows: OpsRow[] = [];
  for (const w of workers) {
    rows.push({
      id: w.id,
      name: w.name,
      color: w.color,
      status: w.status,
      seen: w.status === 'done' || w.status === 'needs_input' ? w.acked : true,
      task: w.task?.name ?? (w.kind === 'shell' ? 'Shared shell' : (w.title ?? 'No task yet')),
      detail: w.task?.summary ?? w.activity ?? '',
      branch: w.worktree?.branch,
      pr: w.pr?.number,
      prUrl: w.pr?.url,
      tokens: w.usage ? tokensOf(w.usage) : undefined,
      cost: w.usage && w.usage.costKnown !== false ? w.usage.cost : undefined,
      waitingSince: w.waitingSince,
      provider: w.provider,
      model: w.usage?.model ?? w.model,
    });
  }
  rows.sort(
    (a, b) =>
      ORDER[a.status] - ORDER[b.status] ||
      (a.waitingSince ?? Number.POSITIVE_INFINITY) - (b.waitingSince ?? Number.POSITIVE_INFINITY) ||
      a.name.localeCompare(b.name),
  );
  return rows;
}

/** e.g. 12s, 5m, 3h, 2d. */
export function fmtAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export interface OpsTotals {
  workers: number;
  waiting: number;
  working: number;
  tokens: number;
  cost: number;
}

export function opsTotals(rows: OpsRow[]): OpsTotals {
  let waiting = 0;
  let working = 0;
  let tokens = 0;
  let cost = 0;
  for (const r of rows) {
    if (r.status === 'needs_input') waiting++;
    if (r.status === 'working') working++;
    tokens += r.tokens ?? 0;
    cost += r.cost ?? 0;
  }
  return { workers: rows.length, waiting, working, tokens, cost };
}

export { fmtCost, fmtTokens };
