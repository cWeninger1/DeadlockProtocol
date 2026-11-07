import { Room, type Client } from "@colyseus/core";
import { advancePlayer, spawnPlayer, type Player } from "@dp/game-config";
import {
  idleInput,
  isInput,
  network,
  type InputMessage,
  type Snapshot,
} from "@dp/protocol";

type Member = {
  player: Player;
  input: InputMessage;
  receivedAt: number;
  queue: InputMessage[];
  acknowledged: number;
};
export class MovementRoom extends Room {
  maxClients = 2;
  maxMessagesPerSecond = 180;
  private tick = 0;
  private elapsed = 0;
  private members = new Map<string, Member>();
  onCreate() {
    this.onMessage("input", (client, value: unknown) => {
      const member = this.members.get(client.sessionId);
      if (!member) return;
      if (
        !isInput(value) ||
        value.sequence <= member.input.sequence ||
        member.queue.length >= network.maxQueuedInputs
      )
        return;
      member.input = value;
      member.queue.push(value);
      member.receivedAt = this.tick;
    });
    this.setSimulationInterval((deltaTime) => {
      // Timers can arrive late under load. Preserve the fixed simulation rate.
      this.elapsed += Math.min(deltaTime, 250);
      while (this.elapsed >= network.tickMs) {
        this.elapsed -= network.tickMs;
        this.simulateTick();
      }
    }, network.tickMs);
  }
  private simulateTick() {
    this.tick++;
    for (const member of this.members.values()) {
      const fresh = this.tick - member.receivedAt <= network.inputTimeoutTicks;
      const command = member.queue.shift();
      if (command) {
        member.player = advancePlayer(member.player, command);
        member.acknowledged = command.sequence;
      } else if (!fresh) {
        member.player = advancePlayer(member.player, idleInput);
      }
    }
    if (this.tick % network.snapshotEvery === 0) {
      const snapshot: Snapshot = {
        tick: this.tick,
        players: Array.from(this.members, ([id, m]) => ({
          id,
          player: m.player,
          yaw: m.input.yaw,
          sequence: m.acknowledged,
        })),
      };
      this.broadcast("snapshot", snapshot);
    }
  }
  onJoin(client: Client) {
    const occupied = new Set(
      Array.from(this.members.values(), (m) => m.player.z),
    );
    const z = occupied.has(-16) ? -12 : -16;
    this.members.set(client.sessionId, {
      player: { ...spawnPlayer(), x: 2, z },
      input: { ...idleInput, sequence: 0 },
      receivedAt: this.tick,
      queue: [],
      acknowledged: 0,
    });
  }
  onLeave(client: Client) {
    this.members.delete(client.sessionId);
  }
}
