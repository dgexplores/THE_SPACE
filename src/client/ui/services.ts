import './services.css';
import type { ServiceInfo, ServicesState } from '../../shared/protocol';
import { store } from '../state';
import { h, openModal, timeAgo } from './dom';
import { copy, copyButton, guessOs, openCommand, OS_LABEL, type Os } from './team';

/** Whether this page came over the office's Tailscale network, where every server has its own link. */
function onTailnet(s: ServicesState): boolean {
  return !!s.tailnet && location.hostname === s.tailnet;
}

export function serviceUrl(port: number, s = store.services): string {
  // Tailscale Serve points <office>.ts.net:<port> at the office, which relays it by the port.
  if (onTailnet(s)) return `https://${s.tailnet}:${port}`;
  // The tunnel lands on the office's own port, so it speaks whatever the office speaks.
  return `${location.protocol}//localhost:${port}`;
}

/**
 * One command that tunnels localhost:<port> to the office, which relays it to the worker's
 * server, and opens it once the tunnel is up. It uses the same SSH access as the office itself.
 */
export function serviceTunnel(s: ServicesState, port: number, os: Os): string {
  const open = openCommand(serviceUrl(port), os);
  return `ssh -N -o ExitOnForwardFailure=yes -o PermitLocalCommand=yes -o LocalCommand="${open}" -L ${port}:localhost:${s.port} ${s.ssh ?? 'you@your-server'}`;
}

/**
 * The command that opens every worker's server on someone's own computer by itself, as each one
 * starts (`agent-office tunnel`, src/server/tunnel/). It reaches the office the way this page did.
 */
export function autoTunnel(origin = location.origin): string {
  return origin === 'http://localhost:4600' ? 'agent-office tunnel' : `agent-office tunnel ${origin}`;
}

/** Whether the office is likely on another machine than this browser, so its workers' ports aren't already here. */
function elsewhere(s: ServicesState): boolean {
  return !!s.ssh || !/^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
}

function describe(svc: ServiceInfo): { who: string; color: string; branch?: string } {
  const w = store.workers.get(svc.workerId);
  return { who: w?.name ?? 'A worker', color: w?.color ?? '#8d99ae', branch: w?.worktree?.branch };
}

export function openServices() {
  let os = guessOs();
  let picked: number | null = null;
  let copied: number | null = null;
  /** List rows, or live previews: iframes are heavy, so they only exist on this tab. */
  let view: 'list' | 'previews' = 'list';
  const body = h('div.body.team.services');
  const close = h('button.btn.close', { 'aria-label': 'Close' }, '✕');
  const tabs = h('div.os-tabs');
  const footer = h('footer', {}, h('span.grow', {}, 'Tunnels go through the office, so the office password still guards every page. Keep the terminal open while you look.'));
  const el = h(
    'div.modal',
    { role: 'dialog', 'aria-label': 'Services', style: 'width:min(760px,100%)' },
    h('header', {}, h('h2', {}, '🌐 Services'), tabs, close),
    body,
    footer,
  );

  const pick = async (svc: ServiceInfo) => {
    const s = store.services;
    picked = svc.port;
    copied = (await copy(onTailnet(s) ? serviceUrl(svc.port) : serviceTunnel(s, svc.port, os))) ? svc.port : null;
    render();
  };

  const render = () => {
    const s = store.services;
    const direct = onTailnet(s);
    tabs.replaceChildren(
      h('button.btn', { type: 'button', class: view === 'list' ? 'on' : '', title: 'One row per server', onclick: () => ((view = 'list'), render()) }, '📋 List'),
      h('button.btn', { type: 'button', class: view === 'previews' ? 'on' : '', title: 'A live look at each page', onclick: () => ((view = 'previews'), render()) }, '🖼️ Previews'),
      ...(direct ? [] : (Object.keys(OS_LABEL) as Os[])).map((o) =>
        h('button.btn', { type: 'button', class: o === os ? 'on' : '', onclick: () => ((os = o), (copied = null), render()) }, OS_LABEL[o]),
      ),
    );
    footer.firstElementChild!.textContent = direct
      ? 'Every link goes through the office, so the office sign-in still guards every page.'
      : 'Tunnels go through the office, so the office password still guards every page. Keep the terminal open while you look.';
    if (view === 'previews') {
      renderPreviews();
      return;
    }
    body.replaceChildren(
      h(
        'p.note',
        { style: 'margin:0 0 12px' },
        direct
          ? 'Web servers the workers are running. Each has its own link on your Tailscale network: open it, or click the row to copy it for someone else on the network.'
          : 'Web servers the workers are running. Click one to copy a command that opens it on your computer — run it in a terminal and the page opens by itself.',
      ),
    );
    if (!direct && elsewhere(s)) {
      body.append(
        h(
          'div.svc-auto',
          {},
          h('p', {}, '⚡ Open them all, by themselves'),
          h(
            'p.note',
            {},
            'Run this on your computer and leave it running. Every server a worker starts opens on the same port there (',
            h('code', {}, 'localhost:5173'),
            ' is the worker’s), and closes when the worker stops it. It needs the ',
            h('code', {}, 'agent-office'),
            ' command on your computer: the install line in the README.',
          ),
          h('div.cmd', {}, h('pre', {}, autoTunnel()), copyButton('Copy', () => autoTunnel())),
        ),
      );
    }
    if (!s.items.length) {
      body.append(
        h(
          'div.svc-empty',
          {},
          h('p', {}, 'Nothing running yet.'),
          h('p.note', {}, 'When a worker starts a web server — ', h('code', {}, 'npm run dev'), ', a preview build, ', h('code', {}, 'python -m http.server'), ' — it shows up here within a few seconds. Try prompting: “start the dev server in the background so we can review it”.'),
        ),
      );
      return;
    }
    const list = h('ul.svc-list');
    for (const svc of s.items) {
      const { who, color, branch } = describe(svc);
      const on = picked === svc.port;
      const title = direct ? `Open ${serviceUrl(svc.port)}` : `Open ${serviceUrl(svc.port)} (needs the tunnel, unless the office runs on this computer)`;
      const open = h('a.btn', { href: serviceUrl(svc.port), target: '_blank', rel: 'noopener', title }, 'Open ↗');
      open.addEventListener('click', (e) => e.stopPropagation());
      const li = h(
        'li',
        { class: on ? 'on' : '', tabindex: 0, role: 'button', title: direct ? 'Copy the link' : 'Copy the tunnel command' },
        h('span.dot', { style: `background:${color}` }),
        h(
          'div.svc-main',
          {},
          h('div.svc-title', {}, svc.title || svc.command),
          h('div.svc-meta', {}, [who, branch ? `🌿 ${branch}` : '', svc.title ? svc.command : '', `started ${timeAgo(svc.since)}`].filter(Boolean).join(' · ')),
        ),
        h('span.svc-port', {}, `:${svc.port}`),
        open,
      );
      li.addEventListener('click', () => void pick(svc));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void pick(svc);
        }
      });
      list.append(li);
    }
    body.append(list);

    const svc = s.items.find((i) => i.port === picked);
    if (svc && direct) {
      body.append(
        copied === svc.port
          ? h('p.team-status.ok', {}, `✅ Copied ${serviceUrl(svc.port)}. Anyone on the network who's signed in to the office can open it.`)
          : h('p.team-status', {}, `The link for :${svc.port}: ${serviceUrl(svc.port)}`),
      );
    } else if (svc) {
      const cmd = serviceTunnel(s, svc.port, os);
      body.append(
        copied === svc.port
          ? h('p.team-status.ok', {}, `✅ Copied. Paste it in a terminal: it opens ${serviceUrl(svc.port)} once the tunnel is up.`)
          : h('p.team-status', {}, `The command for :${svc.port} — run it in a terminal, and it opens ${serviceUrl(svc.port)}.`),
        h('div.cmd', {}, h('pre', {}, cmd), copyButton('Copy', () => cmd)),
      );
    } else if (picked !== null) {
      body.append(h('p.team-status.error', {}, `The server on :${picked} stopped.`));
    }
    if (direct) return;
    body.append(
      s.ssh
        ? h('p.note', {}, 'It uses the same SSH access as the office. Not invited yourself (you set the office up)? Run ', h('code', {}, `${s.deploy ?? 'deploy/aws.sh'} service <port>`), ' instead.')
        : h('p.note', {}, 'Replace ', h('code', {}, 'you@your-server'), ' with how you SSH to the office\'s machine. If the office runs on this computer, just click Open.'),
    );
  };

  /** Live pages side by side: one iframe each, so this tab is the only place they exist. */
  function renderPreviews() {
    const s = store.services;
    body.replaceChildren(
      h(
        'p.note',
        { style: 'margin:0 0 12px' },
        'Live pages, as the workers see them. A page that refuses embedding shows blank here — open it instead.',
      ),
    );
    if (!s.items.length) {
      body.append(
        h(
          'div.svc-empty',
          {},
          h('p', {}, 'Nothing running yet.'),
          h('p.note', {}, 'When a worker starts a web server, its page shows up here live.'),
        ),
      );
      return;
    }
    const grid = h('div.svc-grid');
    for (const svc of s.items) {
      const { who, color, branch } = describe(svc);
      const url = serviceUrl(svc.port);
      const open = h('a.btn', { href: url, target: '_blank', rel: 'noopener', title: `Open ${url}` }, 'Open ↗');
      open.addEventListener('click', (e) => e.stopPropagation());
      grid.append(
        h(
          'div.svc-card',
          {},
          h('iframe', {
            src: url,
            title: svc.title || svc.command,
            loading: 'lazy',
            sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups',
          }),
          h(
            'div.svc-cap',
            {},
            h('span.dot', { style: `background:${color}` }),
            h('div.svc-main', {}, h('div.svc-title', {}, svc.title || svc.command), h('div.svc-meta', {}, [who, branch ? `🌿 ${branch}` : '', `:${svc.port}`].filter(Boolean).join(' · '))),
            open,
          ),
        ),
      );
    }
    body.append(grid);
  }

  const unsubs = [store.on('services', render), store.on('workers', render)];
  // Keeps "up 5m" fresh.
  const tick = setInterval(render, 30_000);
  const modal = openModal(el, {
    doing: '🌐 at the services board',
    onClose: () => {
      unsubs.forEach((u) => u());
      clearInterval(tick);
    },
  });
  close.addEventListener('click', () => modal.close());
  render();
}
