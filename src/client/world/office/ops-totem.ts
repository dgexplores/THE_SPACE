import * as THREE from 'three';
import { mesh, roundedBox, textPlane, toon } from '../toon';
import type { Fixture } from './fixture';
import { PALETTE } from './materials';

declare module '../types' {
  interface OfficeHandles {
    /** The freestanding 📊 Ops totem by the services wall (features/ops). */
    opsScreen: THREE.Mesh;
  }
}

/** A portrait status totem on the east side, facing the desks across from the services wall. */
const TOTEM = { x: 13.5, z: -4, width: 1.7, height: 2.5 } as const;

export const opsTotem: Fixture<'opsScreen'> = (site) => {
  const totem = new THREE.Group();
  // Pedestal it stands on.
  totem.add(mesh(roundedBox(0.7, 1.0, 0.7, 0.08), toon(PALETTE.ink), 0, 0.5, -0.1));
  // Framed screen, tilted a touch toward whoever walks up.
  const frame = mesh(roundedBox(TOTEM.width + 0.18, 0.12, TOTEM.height + 0.18, 0.06), toon(PALETTE.ink), 0, 0, 0);
  frame.rotation.x = Math.PI / 2;
  const opsScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(TOTEM.width, TOTEM.height),
    new THREE.MeshBasicMaterial({ color: '#1b1d2e' }),
  );
  opsScreen.position.z = 0.07;
  const head = new THREE.Group();
  head.add(frame, opsScreen);
  head.position.set(0, 2.1, 0);
  head.rotation.x = -0.06;
  totem.add(head);
  const label = textPlane('📊 Ops', { bg: '#fffaf3', size: 64 });
  label.scale.multiplyScalar(1.1);
  label.position.set(0, 3.62, 0.1);
  totem.add(label);
  totem.position.set(TOTEM.x, 0, TOTEM.z);
  totem.rotation.y = -Math.PI / 2;
  site.group.add(totem);
  // Walk around it, not through it; the label floats over it.
  site.colliders.push({ minX: TOTEM.x - 0.5, maxX: TOTEM.x + 0.5, minZ: TOTEM.z - 0.5, maxZ: TOTEM.z + 0.5, top: 3.8, fence: true });
  // Walk up to its front (west of it, facing the desks).
  const it = { kind: 'ops' as const, x: TOTEM.x - 1.6, z: TOTEM.z, radius: 2.4 };
  site.interactables.push(it);
  totem.userData.interact = it;
  return { handle: { opsScreen } };
};
