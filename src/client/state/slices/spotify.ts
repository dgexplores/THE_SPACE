import type { SpotifyState } from '../../../shared/protocol';
import type { Slice, Store } from '../store';

declare module '../store' {
  interface Store {
    /** What's on the 🎵 Spotify wall: one shared track, picked by link. Null while the wall is bare. */
    spotify: SpotifyState | null;
  }
  interface Topics {
    spotify: true;
  }
}

export const spotify: Slice = {
  init(s: Store) {
    s.spotify = null;
  },
  on: {
    spotify(s, m) {
      s.spotify = m.state;
      return ['spotify'];
    },
  },
  enter(s, v) {
    s.spotify = v.spotify;
    return ['spotify'];
  },
};
