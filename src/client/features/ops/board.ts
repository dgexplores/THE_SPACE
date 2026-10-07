import * as THREE from 'three';
import { fmtCost, fmtTokens, type OpsRow } from './rows';

const FONT = 'Nunito, ui-rounded, system-ui, sans-serif';
const INK = '#1b1d2e';
const PAPER = '#f8f9fa';
const MUTED = '#9aa0b8';

const STATUS_COLOR: Record<OpsRow['status'], string> = {
  needs_input: '#ef476f',
  done: '#06d6a0',
  working: '#ffd166',
  starting: '#5bc0eb',
  idle: '#9aa0b8',
  exited: '#5a5f7a',
  offline: '#5a5f7a',
};

const STATUS_WORD: Record<OpsRow['status'], string> = {
  needs_input: 'NEEDS YOU',
  done: 'DONE',
  working: 'WORKING',
  starting: 'STARTING',
  idle: 'IDLE',
  exited: 'EXITED',
  offline: 'OFFLINE',
};

function clip(g: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (g.measureText(text).width <= maxW) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (g.measureText(`${text.slice(0, mid)}…`).width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo)}…`;
}

/**
 * The 📊 Ops totem's screen: every worker's task, state, branch, PR and spend, needs-you
 * first. Dark like the machine monitor, redrawn only when what's shown changes.
 */
export class OpsBoardTexture {
  readonly texture: THREE.CanvasTexture;
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private drawn = '';

  constructor() {
    // The totem's portrait screen (1.7 × 2.5 m).
    this.canvas.width = 680;
    this.canvas.height = 1000;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
  }

  render(rows: OpsRow[]) {
    // Worker updates stream in constantly; only redraw when what's shown changes.
    const key = JSON.stringify(
      rows.map((r) => [r.id, r.status, r.seen, r.task, r.detail, r.branch, r.pr, r.tokens, r.cost, r.waitingSince]),
    );
    if (key === this.drawn) return;
    this.drawn = key;
    const g = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    g.fillStyle = INK;
    g.fillRect(0, 0, W, H);

    // Header: what this is, and the floor's counts.
    const waiting = rows.filter((r) => r.status === 'needs_input').length;
    const working = rows.filter((r) => r.status === 'working').length;
    g.textAlign = 'left';
    g.fillStyle = '#ffffff';
    g.font = `900 44px ${FONT}`;
    g.fillText('📊 Ops', 28, 62);
    g.textAlign = 'right';
    g.fillStyle = waiting ? STATUS_COLOR.needs_input : MUTED;
    g.font = `800 30px ${FONT}`;
    g.fillText(waiting ? `🙋 ${waiting} need you` : `${working} working · ${rows.length} total`, W - 28, 58);
    g.textAlign = 'left';

    if (!rows.length) {
      g.textAlign = 'center';
      g.fillStyle = PAPER;
      g.font = `900 40px ${FONT}`;
      g.fillText('No workers yet', W / 2, H / 2 - 20);
      g.fillStyle = MUTED;
      g.font = `700 30px ${FONT}`;
      g.fillText('E at an empty desk hires one', W / 2, H / 2 + 32);
      g.textAlign = 'left';
      this.texture.needsUpdate = true;
      return;
    }

    // Footer totals, drawn first so rows never cover them.
    const tokens = rows.reduce((n, r) => n + (r.tokens ?? 0), 0);
    const cost = rows.reduce((n, r) => n + (r.cost ?? 0), 0);
    g.fillStyle = MUTED;
    g.font = `700 26px ${FONT}`;
    const more = rows.length - 9;
    g.fillText(
      `💸 ${fmtTokens(tokens)}${cost ? ` · ${fmtCost(cost)}` : ''}${more > 0 ? ` · +${more} more` : ''}`,
      28,
      H - 26,
    );

    const shown = rows.slice(0, 9);
    const top = 96;
    const rowH = (H - top - 70) / shown.length;
    shown.forEach((r, i) => {
      const y = top + i * rowH;
      if (!r.seen) {
        g.fillStyle = 'rgba(239,71,111,.12)';
        g.fillRect(14, y + 4, W - 28, rowH - 8);
      }
      // Status bar down the row's left edge.
      g.fillStyle = STATUS_COLOR[r.status];
      g.fillRect(14, y + 10, 8, rowH - 20);
      // Worker's dot.
      g.beginPath();
      g.arc(58, y + rowH / 2 - 8, 17, 0, Math.PI * 2);
      g.fillStyle = r.color;
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = PAPER;
      g.stroke();
      // Name and state.
      g.fillStyle = PAPER;
      g.font = `800 34px ${FONT}`;
      g.fillText(clip(g, r.name, 300), 88, y + rowH / 2 - 2);
      g.fillStyle = STATUS_COLOR[r.status];
      g.font = `900 24px ${FONT}`;
      g.textAlign = 'right';
      g.fillText(STATUS_WORD[r.status], W - 28, y + rowH / 2 - 2);
      g.textAlign = 'left';
      // Task and where its work stands.
      g.fillStyle = MUTED;
      g.font = `700 27px ${FONT}`;
      const meta = [r.pr ? `PR #${r.pr}` : '', r.branch ? `🌿 ${r.branch}` : '', r.tokens ? fmtTokens(r.tokens) : '']
        .filter(Boolean)
        .join(' · ');
      g.fillText(clip(g, `${r.task}${meta ? ` · ${meta}` : ''}`, W - 116), 88, y + rowH / 2 + 34);
    });
    this.texture.needsUpdate = true;
  }
}
