import { advancePlayer, spawnPlayer } from "@dp/game-config";
import type { InputMessage, PlayerSnapshot } from "@dp/protocol";

export class MovementPrediction {
  current = spawnPlayer();
  previous = this.current;
  pending: InputMessage[] = [];
  initialized = false;
  private offset = { x: 0, y: 0, z: 0 };
  private lastTick = -1;

  step(command: InputMessage) {
    if (!this.initialized || this.pending.length >= 120) return;
    this.pending.push(command);
    this.previous = this.current;
    this.current = advancePlayer(this.current, command);
  }

  reconcile(snapshot: PlayerSnapshot, tick: number) {
    if (tick <= this.lastTick) return;
    this.lastTick = tick;
    this.pending = this.pending.filter((c) => c.sequence > snapshot.sequence);
    let corrected = snapshot.player;
    for (const command of this.pending)
      corrected = advancePlayer(corrected, command);
    const dx = this.current.x - corrected.x,
      dy = this.current.y - corrected.y,
      dz = this.current.z - corrected.z;
    if (this.initialized && Math.hypot(dx, dy, dz) < 2) {
      this.offset.x += dx;
      this.offset.y += dy;
      this.offset.z += dz;
      this.previous = {
        ...this.previous,
        x: this.previous.x - dx,
        y: this.previous.y - dy,
        z: this.previous.z - dz,
      };
    } else {
      this.offset = { x: 0, y: 0, z: 0 };
      this.previous = corrected;
    }
    this.current = corrected;
    this.initialized = true;
  }

  render(alpha: number, seconds: number) {
    const decay = Math.exp(-15 * Math.min(seconds, 0.1));
    this.offset.x *= decay;
    this.offset.y *= decay;
    this.offset.z *= decay;
    return {
      x:
        this.previous.x +
        (this.current.x - this.previous.x) * alpha +
        this.offset.x,
      y:
        this.previous.y +
        (this.current.y - this.previous.y) * alpha +
        this.offset.y,
      z:
        this.previous.z +
        (this.current.z - this.previous.z) * alpha +
        this.offset.z,
    };
  }
}
