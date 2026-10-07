// What's on the 🎵 Spotify wall: one shared track per floor, picked by link. Playback itself
// stays in the browser (Spotify blocks embedding), through the modal's "Open in Spotify".
export interface SpotifyState {
  /** The open.spotify.com URL: track, album, playlist, episode or show. */
  url: string;
  title: string;
  artist: string;
  /** Cover art (Spotify's CDN), for the wall. */
  art?: string;
  /** Who put it on. */
  by?: string;
  /** When, on the office's clock (ms). */
  at: number;
}

export type SpotifyClientMsg = { t: 'spotify.set'; url: string } | { t: 'spotify.clear' };

export type SpotifyServerMsg = { t: 'spotify'; state: SpotifyState | null };
