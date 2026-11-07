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
  messages: number;
  jump: boolean;
};
export class MovementRoom extends Room {
  maxClients = 2;
  maxMessagesPerSecond = 180;
  private tick = 0;
  private members = new Map<string, Member>();
  onCreate() {
    this.onMessage("input", (client, value: unknown) => {
      const member = this.members.get(client.sessionId);
      if (!member) return;
      member.messages++;
      if (
        member.messages > network.maxMessagesPerTick ||
        !isInput(value) ||
        value.sequence <= member.input.sequence
      )
        return;
      member.input = value;
      member.jump ||= value.jump;
      member.receivedAt = this.tick;
    });
    this.setSimulationInterval(() => {
      this.tick++;
      for (const member of this.members.values()) {
        const fresh =
          this.tick - member.receivedAt <= network.inputTimeoutTicks;
        member.player = advancePlayer(
          member.player,
          fresh ? { ...member.input, jump: member.jump } : idleInput,
        );
        member.jump = false;
        member.messages = 0;
      }
      if (this.tick % network.snapshotEvery === 0) {
        const snapshot: Snapshot = {
          tick: this.tick,
          players: Array.from(this.members, ([id, m]) => ({
            id,
            player: m.player,
            yaw: m.input.yaw,
            sequence: m.input.sequence,
          })),
        };
        this.broadcast("snapshot", snapshot);
      }
    }, network.tickMs);
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
      messages: 0,
      jump: false,
    });
  }
  onLeave(client: Client) {
    this.members.delete(client.sessionId);
  }
}
