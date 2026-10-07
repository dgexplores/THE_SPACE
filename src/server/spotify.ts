import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SpotifyState } from '../shared/protocol.js';
import { parseSpotifyUrl, spotifyKindWord } from '../shared/spotify.js';

interface Saved {
  url: string;
  title: string;
  artist: string;
  art?: string;
  by?: string;
  at: number;
}

const OEMBED = 'https://open.spotify.com/oembed';

/** The track's title, artist and cover, from Spotify's oEmbed (no login needed). */
export async function lookupTrack(canonical: string): Promise<{ title: string; artist: string; art?: string } | { error: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10_000);
  try {
    const res = await fetch(`${OEMBED}?url=${encodeURIComponent(canonical)}`, {
      signal: ctl.signal,
      headers: { 'user-agent': 'agent-office/spotify-wall' },
    });
    if (!res.ok) return { error: 'Spotify did not recognise that link' };
    const body = (await res.json()) as { title?: unknown; author_name?: unknown; thumbnail_url?: unknown };
    if (typeof body.title !== 'string' || !body.title) return { error: 'Spotify did not recognise that link' };
    return {
      title: body.title,
      artist: typeof body.author_name === 'string' ? body.author_name : '',
      art: typeof body.thumbnail_url === 'string' ? body.thumbnail_url : undefined,
    };
  } catch {
    return { error: 'Could not reach Spotify just now' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The 🎵 Spotify wall on one floor, saved in .agent-office/spotify.json. It only says what's
 * on the wall; playback itself stays in the browser, through the modal's "Open in Spotify".
 */
export class SpotifyWall {
  private s: Saved | null = null;
  private file: string;

  constructor(dataDir: string) {
    this.file = path.join(dataDir, 'spotify.json');
    this.load();
  }

  state(): SpotifyState | null {
    return this.s ? { ...this.s } : null;
  }

  /**
   * Puts a Spotify link on the wall. The title and cover come from Spotify's oEmbed when it
   * answers; when it doesn't (it sometimes won't), the link still goes up under its kind, and
   * the modal's embedded player names it properly.
   */
  async set(url: unknown, by: string): Promise<{ changed: boolean } | { error: string }> {
    const p = parseSpotifyUrl(url);
    if ('error' in p) return p;
    const meta = await lookupTrack(p.url);
    this.s = {
      url: p.url,
      ...('error' in meta ? { title: `${spotifyKindWord(p.kind)} on Spotify`, artist: '' } : meta),
      by,
      at: Date.now(),
    };
    this.save();
    return { changed: true };
  }

  clear(): boolean {
    if (!this.s) return false;
    this.s = null;
    this.save();
    return true;
  }

  private save() {
    writeFileSync(this.file, JSON.stringify(this.s));
  }

  private load() {
    if (!existsSync(this.file)) return;
    try {
      const s = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<Saved>;
      const p = parseSpotifyUrl(s.url);
      if ('error' in p || typeof s.title !== 'string' || !s.title || typeof s.at !== 'number') return;
      this.s = {
        url: p.url,
        title: s.title,
        artist: typeof s.artist === 'string' ? s.artist : '',
        ...(typeof s.art === 'string' ? { art: s.art } : {}),
        ...(typeof s.by === 'string' ? { by: s.by } : {}),
        at: s.at,
      };
    } catch {
      // a half-written file: the wall starts bare
    }
  }
}
