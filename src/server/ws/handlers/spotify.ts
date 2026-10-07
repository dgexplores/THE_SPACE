// The 🎵 Spotify wall on every floor: one shared track, picked by link.
import type { Floor } from '../../floor.js';
import type { SpotifyClientMsg } from '../../../shared/protocol.js';
import type { Ctx } from '../../office/context.js';
import { here } from './common.js';
import type { HandlerMap, ViewPieces } from './types.js';

export const spotifyView: ViewPieces['spotify'] = (_ctx, floor) => floor?.spotifyWall.state() ?? null;
export const spotifyChanged = (ctx: Ctx, floor: Floor) => ctx.toFloor(floor, { t: 'spotify', state: floor.spotifyWall.state() });

export const spotifyHandlers = {
  'spotify.set'(ctx, c, msg) {
    const who = c.peer.name;
    const floor = here(ctx, c);
    if (!floor) return;
    // The cover lookup leaves the office; answer when it's back.
    void floor.spotifyWall.set(msg.url, who).then((r) => {
      if ('error' in r) return ctx.warn(c, r.error);
      if (!r.changed) return;
      spotifyChanged(ctx, floor);
      const s = floor.spotifyWall.state();
      if (s) ctx.toastFloor(floor, `🎵 ${who} put “${s.title}” by ${s.artist} on the Spotify wall`);
    });
  },
  'spotify.clear'(ctx, c) {
    const floor = here(ctx, c);
    if (!floor || !floor.spotifyWall.clear()) return;
    spotifyChanged(ctx, floor);
    ctx.toastFloor(floor, `🔇 ${c.peer.name} took it off the Spotify wall`);
  },
} satisfies HandlerMap<SpotifyClientMsg>;
