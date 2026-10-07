import './ui.css';
import { store } from '../../state';
import { h, openModal, timeAgo } from '../../ui/dom';
import { fmtAgo, fmtCost, fmtTokens, opsRows, opsTotals, type OpsRow } from './rows';

export interface OpsUiDeps {
  /** Opens a worker's terminal (see features/workers/views). */
  openTerminal(id: string): void;
}

/** The 📊 Ops window: every worker's task, state, branch, PR and spend, needs-you first. */
export function openOps(deps: OpsUiDeps) {
  const body = h('div.body');
  const close = h('button.btn.close', { 'aria-label': 'Close' }, '✕');
  const footer = h('footer', {}, h('span.grow', {}, 'A row opens that worker’s terminal. E at the totem by the services wall shows the same.'));
  const el = h(
    'div.modal.ops',
    { role: 'dialog', 'aria-label': 'Ops', style: 'width:min(860px,100%)' },
    h('header', {}, h('h2', {}, '📊 Ops'), close),
    body,
    footer,
  );

  const render = () => {
    const rows = opsRows(store.workers.values());
    const t = opsTotals(rows);
    body.replaceChildren(
      h(
        'p.note',
        { style: 'margin:0 0 12px' },
        rows.length
          ? 'Who’s on what across this floor, needs-you first. Click a row to open that worker’s terminal.'
          : 'No workers on this floor yet. Walk up to an empty desk and press E to hire one.',
      ),
    );
    if (!rows.length) return;
    const list = h('ul.svc-list.ops-list');
    for (const r of rows) list.append(rowEl(r));
    body.append(list);
    footer.firstElementChild!.textContent =
      `${t.workers} worker${t.workers === 1 ? '' : 's'} · ${t.working} working · ${t.waiting} need you · 💸 ${fmtTokens(t.tokens)}${t.cost ? ` · ${fmtCost(t.cost)}` : ''}`;
  };

  function rowEl(r: OpsRow): HTMLElement {
    const meta = [
      r.provider ?? '',
      r.model ?? '',
      r.branch ? `🌿 ${r.branch}` : '',
      r.pr ? `PR #${r.pr}` : '',
      r.tokens ? fmtTokens(r.tokens) : '',
      r.cost ? fmtCost(r.cost) : '',
      r.waitingSince ? `waiting ${fmtAgo(r.waitingSince)}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const term = h('button.btn', { type: 'button', title: `Open ${r.name}’s terminal` }, '💻');
    term.addEventListener('click', (e) => {
      e.stopPropagation();
      deps.openTerminal(r.id);
    });
    const open = r.prUrl
      ? h('a.btn', { href: r.prUrl, target: '_blank', rel: 'noopener', title: `PR #${r.pr} on GitHub` }, '🔀')
      : null;
    open?.addEventListener('click', (e) => e.stopPropagation());
    const li = h(
      'li',
      { tabindex: 0, role: 'button', title: `Open ${r.name}’s terminal` },
      h('span.dot', { style: `background:${r.color}` }),
      h(
        'div.svc-main',
        {},
        h('div.svc-title', {}, r.name, ' ', h('span.pill', { class: r.status }, STATUS_WORD[r.status])),
        h('div.svc-meta', {}, [r.task, meta].filter(Boolean).join(' · ')),
        r.detail ? h('div.svc-meta', { title: r.detail }, r.detail) : null,
      ),
      r.waitingSince ? h('span.svc-wait', { title: `Waiting since ${new Date(r.waitingSince).toLocaleTimeString()}` }, fmtAgo(r.waitingSince)) : null,
      open,
      term,
    );
    const go = () => deps.openTerminal(r.id);
    li.addEventListener('click', go);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
    return li;
  }

  const unsubs = [store.on('workers', render)];
  // Keeps "waiting 5m" fresh.
  const tick = setInterval(render, 30_000);
  const modal = openModal(el, {
    doing: '📊 watching ops',
    onClose: () => {
      unsubs.forEach((u) => u());
      clearInterval(tick);
    },
  });
  close.addEventListener('click', () => modal.close());
  render();
}

const STATUS_WORD: Record<OpsRow['status'], string> = {
  needs_input: 'NEEDS YOU',
  done: 'DONE',
  working: 'WORKING',
  starting: 'STARTING',
  idle: 'IDLE',
  exited: 'EXITED',
  offline: 'OFFLINE',
};
