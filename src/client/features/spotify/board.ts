import * as THREE from 'three';
import type { SpotifyState } from '../../../shared/protocol';

const FONT = 'Nunito, ui-rounded, system-ui, sans-serif';
const INK = '#1b1d2e';
const PAPER = '#f8f9fa';
const MUTED = '#9aa0b8';
const GREEN = '#1ed760';

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
 * The 🎵 Spotify totem's screen: the shared track's cover, title and who put it on.
 * Cover art loads like an <img> (display only, never read back), so no CORS is needed.
 */
export class SpotifyTexture {
  readonly texture: THREE.CanvasTexture;
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private drawn = '';
  private art: { url: string; img: HTMLImageElement } | null = null;

  constructor() {
    // The totem's portrait screen (1.7 × 2.5 m), a pair with the 📊 Ops one.
    this.canvas.width = 680;
    this.canvas.height = 1000;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
  }

  render(state: SpotifyState | null) {
    const key = JSON.stringify(state ? [state.url, state.title, state.artist, state.art, state.by, state.at] : null);
    if (key === this.drawn) return;
    this.drawn = key;
    const g = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    g.fillStyle = INK;
    g.fillRect(0, 0, W, H);

    g.textAlign = 'left';
    g.fillStyle = '#ffffff';
    g.font = `900 44px ${FONT}`;
    g.fillText('🎵 Spotify', 28, 62);

    if (!state) {
      g.textAlign = 'center';
      g.fillStyle = PAPER;
      g.font = `900 40px ${FONT}`;
      g.fillText('Nothing on', W / 2, H / 2 - 44);
      g.fillText('the wall yet', W / 2, H / 2 + 4);
      g.fillStyle = MUTED;
      g.font = `700 30px ${FONT}`;
      g.fillText('E here, paste a link,', W / 2, H / 2 + 64);
      g.fillText('play it in Spotify', W / 2, H / 2 + 104);
      g.textAlign = 'left';
      this.texture.needsUpdate = true;
      return;
    }

    // Cover art, loading it the first time this track shows.
    const size = 560;
    const ax = (W - size) / 2;
    const ay = 100;
    if (state.art && (!this.art || this.art.url !== state.art)) {
      const img = new Image();
      const url = state.art;
      img.onload = () => {
        this.art = { url, img };
        this.drawn = '';
        this.render(state);
      };
      img.src = url;
      this.art = null;
    }
    if (this.art) g.drawImage(this.art.img, ax, ay, size, size);
    else {
      g.fillStyle = '#25283d';
      g.fillRect(ax, ay, size, size);
      g.textAlign = 'center';
      g.fillStyle = GREEN;
      g.font = '200px sans-serif';
      g.fillText('♪', W / 2, ay + size / 2 + 70);
      g.textAlign = 'left';
    }

    let y = ay + size + 72;
    g.fillStyle = PAPER;
    g.font = `900 44px ${FONT}`;
    for (const line of wrapTitle(g, state.title, W - 56)) {
      g.fillText(line, 28, y);
      y += 54;
    }
    g.fillStyle = MUTED;
    g.font = `700 34px ${FONT}`;
    g.fillText(clip(g, state.artist || 'Spotify', W - 56), 28, y + 8);
    y += 62;
    g.fillStyle = GREEN;
    g.font = `800 28px ${FONT}`;
    g.fillText(clip(g, state.by ? `on the wall courtesy of ${state.by}` : 'on the wall', W - 56), 28, y);
    this.texture.needsUpdate = true;
  }
}

/** The title in up to 3 lines, ending in "…" when it doesn't fit. */
function wrapTitle(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let i = 0;
  while (i < words.length && lines.length < 3) {
    let line = words[i];
    while (i + 1 < words.length && g.measureText(`${line} ${words[i + 1]}`).width <= maxW) line += ` ${words[++i]}`;
    // A single word wider than the line gets cut where it has to be.
    while (line.length > 1 && g.measureText(line).width > maxW) line = line.slice(0, -1);
    lines.push(line);
    i++;
  }
  if (i < words.length && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[\s,.;:—-]+$/, '')}…`;
  return lines;
}
