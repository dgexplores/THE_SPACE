// Spotify links, shared by the server (which looks them up) and the browser (which embeds
// the player). Pure, so both sides and the tests read it.
export const SPOTIFY_KINDS = ['track', 'album', 'playlist', 'episode', 'show'] as const;
export type SpotifyKind = (typeof SPOTIFY_KINDS)[number];

export interface SpotifyLink {
  /** Canonical https://open.spotify.com/<kind>/<id>. */
  url: string;
  kind: SpotifyKind;
  id: string;
}

/** An open.spotify.com link: track, album, playlist, episode or show. Query and locale prefixes fall off. */
export function parseSpotifyUrl(input: unknown): SpotifyLink | { error: string } {
  if (typeof input !== 'string' || !input.trim()) return { error: 'Paste a Spotify link' };
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return { error: 'That is not a link' };
  }
  if (u.hostname !== 'open.spotify.com') return { error: 'Only open.spotify.com links go on the wall' };
  const m = u.pathname.match(/^\/(?:intl-[^/]+\/)?(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
  if (!m || !SPOTIFY_KINDS.includes(m[1] as SpotifyKind)) {
    return { error: 'Only a track, album, playlist, episode or show link goes on the wall' };
  }
  return { url: `https://open.spotify.com/${m[1]}/${m[2]}`, kind: m[1] as SpotifyKind, id: m[2] };
}

/** The playable embed (dark, matching the wall) for a parsed link. Spotify builds this player for embedding. */
export function spotifyEmbed(link: SpotifyLink): string {
  return `https://open.spotify.com/embed/${link.kind}/${link.id}?utm_source=generator&theme=0`;
}

/** "Track", "Album", … for walls and toasts. */
export function spotifyKindWord(kind: SpotifyKind): string {
  return kind === 'track' ? 'Track' : kind === 'album' ? 'Album' : kind === 'playlist' ? 'Playlist' : kind === 'episode' ? 'Episode' : 'Show';
}
