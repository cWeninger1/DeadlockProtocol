import { Room, type Client } from "@colyseus/core";
import {
  advanceRound,
  createRound,
  type RoundState,
  advancePlayer,
  spawnPlayer,
  createCombat,
  combatRules,
  tracePlayerShot,
  advanceLoadout,
  switchWeapon,
  weapons,
  rangeRifle,
  type CombatState,
  type Player,
  type Team,
} from "@dp/game-config";
import {
  idleInput,
  isInput,
  network,
  type InputMessage,
  type Snapshot,
} from "@dp/protocol";

type Member = {
  player: Player;
  combat: CombatState;
  yaw: number;
  input: InputMessage;
  receivedAt: number;
  queue: InputMessage[];
  acknowledged: number;
};
export class MovementRoom extends Room {
  maxClients = 2;
  maxMessagesPerSecond = 180;
  protected round: RoundState | undefined;
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
    this.onMessage("respawn", (client) => {
      const m = this.members.get(client.sessionId);
      if (
        this.round !== undefined ||
        !m ||
        m.combat.health > 0 ||
        this.tick - m.combat.diedAt < combatRules.respawnTicks
      )
        return;
      this.resetMember(m);
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
    this.updateRound();
    const canPlay = !this.round || this.round.phase === "active";
    const commands = new Map<Member, InputMessage>();
    for (const member of this.members.values()) {
      const fresh = this.tick - member.receivedAt <= network.inputTimeoutTicks;
      const command = member.queue.shift();
      if (command) {
        if (
          canPlay &&
          (!this.round || command.epoch === this.round.epoch) &&
          (!command.combat || command.combat.life === member.combat.life)
        ) {
          if (member.combat.health > 0) {
            member.player = advancePlayer(member.player, command);
            member.yaw = command.yaw;
            commands.set(member, command);
          }
        }
        member.acknowledged = command.sequence;
      } else if (canPlay && !fresh && member.combat.health > 0) {
        member.player = advancePlayer(member.player, idleInput);
      }
    }
    for (const [id, member] of this.members) {
      const c = member.combat;
      if (!canPlay || c.health === 0) continue;
      const command = commands.get(member),
        input = command?.combat;
      if (input?.weapon && input.weapon !== c.loadout.active) {
        c.loadout = switchWeapon(c.loadout, input.weapon, this.tick);
        c.recoil = c.burst = 0;
      }
      if (this.tick - c.shotTick > 12) {
        c.recoil = Math.max(0, c.recoil - rangeRifle.recoilRecovery);
        if (c.recoil === 0) c.burst = 0;
      }
      const before = c.loadout.inventory[c.loadout.active];
      c.loadout = advanceLoadout(
        c.loadout,
        this.tick,
        input?.pressed ?? false,
        input?.held ?? false,
        input?.reload ?? false,
      );
      if (c.loadout.inventory[c.loadout.active].nextShot === before.nextShot)
        continue;
      c.shots++;
      c.shotTick = this.tick;
      const def = weapons[c.loadout.active];
      const pitch = Math.max(
        -1.48,
        Math.min(1.48, (input?.pitch ?? 0) - c.recoil),
      );
      const victimId = tracePlayerShot(
        member.player,
        command!.yaw,
        pitch,
        def.range,
        Array.from(this.members, ([targetId, target]) => ({
          id: targetId,
          ...target,
        })).filter(
          (target) =>
            target.id !== id &&
            target.combat.health > 0 &&
            target.combat.team !== c.team,
        ),
      );
      if (victimId) {
        const victim = this.members.get(victimId)!;
        c.hits++;
        victim.combat.health = Math.max(0, victim.combat.health - def.damage);
        if (victim.combat.health === 0) {
          c.kills++;
          victim.combat.deaths++;
          victim.combat.diedAt = this.tick;
          victim.player = { ...victim.player, vx: 0, vy: 0, vz: 0 };
        }
      }
      if (c.loadout.active === "rifle")
        c.recoil += Math.min(
          rangeRifle.recoil[Math.min(c.burst++, rangeRifle.recoil.length - 1)],
          pitch + 1.48,
        );
    }
    this.updateRound();
    if (this.tick % network.snapshotEvery === 0) {
      const snapshot: Snapshot = {
        tick: this.tick,
        ...(this.round ? { round: this.round } : {}),
        players: Array.from(this.members, ([id, m]) => ({
          id,
          player: m.player,
          yaw: m.yaw,
          combat: m.combat,
          sequence: m.acknowledged,
        })),
      };
      this.broadcast("snapshot", snapshot);
    }
  }
  private resetMember(m: Member) {
    const previous = m.combat;
    m.combat = {
      ...createCombat(previous.team),
      life: previous.life + 1,
      kills: previous.kills,
      deaths: previous.deaths,
      shots: previous.shots,
      hits: previous.hits,
    };
    m.player = this.spawn(previous.team);
    m.yaw = previous.team === "Attackers" ? 0 : Math.PI;
    m.queue = [];
    m.acknowledged = m.input.sequence;
  }
  private updateRound() {
    if (!this.round) return;
    const next = advanceRound(
      this.round,
      this.tick,
      Array.from(this.members.values(), (m) => m.combat),
    );
    if (next === this.round) return;
    this.round = next;
    for (const m of this.members.values()) {
      m.queue = [];
      m.acknowledged = m.input.sequence;
      m.player = { ...m.player, vx: 0, vy: 0, vz: 0 };
      if (next.phase === "freeze" || next.phase === "waiting")
        this.resetMember(m);
    }
  }
  private spawn(team: Team): Player {
    return { ...spawnPlayer(), x: 2, z: team === "Attackers" ? -16 : -12 };
  }
  onJoin(client: Client) {
    const team: Team = Array.from(this.members.values()).some(
      (m) => m.combat.team === "Attackers",
    )
      ? "Defenders"
      : "Attackers";
    this.members.set(client.sessionId, {
      player: this.spawn(team),
      combat: createCombat(team),
      yaw: team === "Attackers" ? 0 : Math.PI,
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

export class RoundRoom extends MovementRoom {
  protected round: RoundState | undefined = createRound();
}
