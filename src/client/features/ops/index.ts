/**
 * The 📊 Ops board: who's on what across the floor, needs-you first. A totem screen by the
 * services wall (world/office/ops-totem.ts), redrawn whenever the workers change, and the same
 * as a dock window (E at the totem, or 📊 Ops in the ☰ menu), where a row opens that worker's
 * terminal. Reads the store only: no messages, no state slice, no protocol.
 */
import type * as THREE from 'three';
import type { Ctx } from '../../core/context';
import { boardHint, onE } from '../../core/hint';
import { store } from '../../state';
import { OpsBoardTexture } from './board';
import { opsRows } from './rows';
import { openOps } from './ui';

// The kinds of thing you can use that this defines (see InteractKinds in world/types.ts).
declare module '../../world/types' {
  interface InteractKinds {
    ops: true;
  }
}

export interface OpsDeps {
  /** Opens a worker's terminal (see features/workers/views). */
  openTerminal(id: string): void;
}

export function installOps(ctx: Ctx, deps: OpsDeps) {
  const { office } = ctx;
  const tex = new OpsBoardTexture();
  const renderOps = () => tex.render(opsRows(store.workers.values()));
  // The totem's screen, on the office map (the castle and the station keep their four boards).
  if (office.opsScreen) {
    const mat = office.opsScreen.material as THREE.MeshBasicMaterial;
    mat.map = tex.texture;
    mat.needsUpdate = true;
  }
  store.on('workers', renderOps);
  renderOps();
  ctx.interactions.define('ops', {
    reach: 9,
    hint: () => boardHint('📊 Ops board'),
    use: onE(() => showOps()),
  });
  function showOps() {
    openOps({ openTerminal: (id) => deps.openTerminal(id) });
  }
  return { showOps, renderOps };
}
