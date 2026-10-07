import * as THREE from 'three';
import { mesh, roundedBox, textPlane, toon } from '../toon';
import type { Fixture } from './fixture';
import { PALETTE } from './materials';

declare module '../types' {
  interface OfficeHandles {
    /** The freestanding 🎵 Spotify totem by the jukebox (features/spotify). */
    spotifyScreen: THREE.Mesh;
  }
}

/** A portrait totem beside the jukebox in the lounge, facing the room. */
const TOTEM = { x: 16.6, z: 3.9, width: 1.7, height: 2.5 } as const;

export const spotifyTotem: Fixture<'spotifyScreen'> = (site) => {
  const totem = new THREE.Group();
  // Pedestal it stands on.
  totem.add(mesh(roundedBox(0.7, 1.0, 0.7, 0.08), toon(PALETTE.ink), 0, 0.5, -0.1));
  // Framed screen, tilted a touch toward whoever walks up.
  const frame = mesh(roundedBox(TOTEM.width + 0.18, 0.12, TOTEM.height + 0.18, 0.06), toon(PALETTE.ink), 0, 0, 0);
  frame.rotation.x = Math.PI / 2;
  const spotifyScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(TOTEM.width, TOTEM.height),
    new THREE.MeshBasicMaterial({ color: '#1b1d2e' }),
  );
  spotifyScreen.position.z = 0.07;
  const head = new THREE.Group();
  head.add(frame, spotifyScreen);
  head.position.set(0, 2.1, 0);
  head.rotation.x = -0.06;
  totem.add(head);
  const label = textPlane('🎵 Spotify', { bg: '#fffaf3', size: 64 });
  label.scale.multiplyScalar(1.1);
  label.position.set(0, 3.62, 0.1);
  totem.add(label);
  totem.position.set(TOTEM.x, 0, TOTEM.z);
  totem.rotation.y = -Math.PI / 2;
  site.group.add(totem);
  // Walk around it, not through it; the label floats over it.
  site.colliders.push({ minX: TOTEM.x - 0.5, maxX: TOTEM.x + 0.5, minZ: TOTEM.z - 0.5, maxZ: TOTEM.z + 0.5, top: 3.8, fence: true });
  // Walk up to its front (west of it, facing the lounge).
  const it = { kind: 'spotify' as const, x: TOTEM.x - 1.6, z: TOTEM.z, radius: 2.4 };
  site.interactables.push(it);
  totem.userData.interact = it;
  return { handle: { spotifyScreen } };
};
