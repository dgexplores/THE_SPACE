/**
 * The 🎵 Spotify wall: one shared track per floor on a totem by the jukebox, picked by link.
 * The server looks the link up (title, artist, cover) and keeps it in spotify.json; playback
 * itself stays in Spotify, through the modal's "Open in Spotify" (Spotify blocks embedding).
 */
import type * as THREE from 'three';
import type { Ctx } from '../../core/context';
import { boardHint, onE } from '../../core/hint';
import { store } from '../../state';
import { SpotifyTexture } from './board';
import { openSpotify } from './ui';

// The kinds of thing you can use that this defines (see InteractKinds in world/types.ts).
declare module '../../world/types' {
  interface InteractKinds {
    spotify: true;
  }
}

export function installSpotify(ctx: Ctx) {
  const { office, net } = ctx;
  const tex = new SpotifyTexture();
  const renderSpotify = () => tex.render(store.spotify);
  // The totem's screen, on the office map (the castle and the station keep theirs bare).
  if (office.spotifyScreen) {
    const mat = office.spotifyScreen.material as THREE.MeshBasicMaterial;
    mat.map = tex.texture;
    mat.needsUpdate = true;
  }
  store.on('spotify', renderSpotify);
  renderSpotify();
  ctx.interactions.define('spotify', {
    reach: 9,
    hint: () => boardHint('🎵 Spotify wall'),
    use: onE(() => showSpotify()),
  });
  function showSpotify() {
    openSpotify(net);
  }
  return { showSpotify, renderSpotify };
}
