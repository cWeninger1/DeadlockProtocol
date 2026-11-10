import { Room, type Client } from "@colyseus/core";
import {
  applyArmorDamage,
  tradeArmor,
  buyRestriction,
  createEconomy,
  credit,
  economyRules,
  rewardRound,
  tradeRifle,
  createLoadout,
  type EconomyState,
  roundRules,
  sideForSquad,
  type Squad,
  advanceObjective,
  createObjective,
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
  isBuyRequest,
  idleInput,
  isInput,
  network,
  type InputMessage,
  type Snapshot,
} from "@dp/protocol";

type Member = {
  economy?: EconomyState;
  squad: Squad;
  player: Player;
  combat: CombatState;
  yaw: number;
  input: InputMessage;
  receivedAt: number;
  queue: InputMessage[];
  acknowledged: number;
  interacting: boolean;
  interactedAt: number;
};
export class MovementRoom extends Room {
  maxClients = 2;
  maxMessagesPerSecond = 180;
  protected round: RoundState | undefined;
  protected rules = roundRules;
  private tick = 0;
  private elapsed = 0;
  private members = new Map<string, Member>();
  onCreate() {
    this.onMessage("buy", (client, value: unknown) => {
      const m = this.members.get(client.sessionId);
      if (!m || !m.economy || !this.round) return;
      let error: string | null = null;
      if (!isBuyRequest(value)) error = "Invalid purchase request.";
      else if (value.epoch !== this.round.epoch || value.life !== m.combat.life)
        error = "The buy window changed. Try again during freeze time.";
      else {
        error = buyRestriction(
          this.round,
          this.tick,
          m.combat.health,
          m.combat.team,
          m.player,
        );
        if (!error && value.item === "armor") {
          const result = tradeArmor(
            m.economy,
            m.combat.armor,
            value.epoch,
            value.action,
          );
          if (result.error) error = result.error;
          else if (result.economy && result.armor !== undefined) {
            m.economy = result.economy;
            m.combat.armor = result.armor;
          }
        } else if (!error) {
          const result = tradeRifle(
            m.economy,
            m.combat.loadout,
            value.epoch,
            this.tick,
            value.action,
          );
          if (result.error) error = result.error;
          else if (result.economy && result.loadout) {
            m.economy = result.economy;
            m.combat.loadout = result.loadout;
          }
        }
      }
      client.send("buyResult", {
        text:
          error ??
          (isBuyRequest(value) && value.item === "armor"
            ? value.action === "refund"
              ? "Armor refunded."
              : "Armor purchased."
            : isBuyRequest(value) && value.action === "refund"
              ? "AR30 refunded."
              : "AR30 purchased. Press 1 to equip."),
      });
    });
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
    const canPlay =
      !this.round ||
      this.round.phase === "active" ||
      this.round.phase === "planted";
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
            member.interacting = command.interact === true;
            member.interactedAt = this.tick;
          }
        }
        if (!commands.has(member)) member.interacting = false;
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
      const interacting =
        this.round &&
        member.interacting &&
        this.tick - member.interactedAt <= network.inputTimeoutTicks;
      const before = c.loadout.inventory[c.loadout.active];
      c.loadout = advanceLoadout(
        c.loadout,
        this.tick,
        !interacting && (input?.pressed ?? false),
        !interacting && (input?.held ?? false),
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
        const damage = applyArmorDamage(
          victim.combat.health,
          victim.combat.armor,
          def.damage,
          def.penetration,
        );
        victim.combat.health = damage.health;
        victim.combat.armor = damage.armor;
        if (victim.combat.health === 0) {
          c.kills++;
          if (member.economy)
            member.economy = credit(member.economy, def.killReward);
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
    if (this.round?.objective) {
      const previousObjective = this.round.objective;
      const objective = advanceObjective(
        this.round.objective,
        this.tick,
        this.round.phase,
        Array.from(this.members, ([id, m]) => ({
          id,
          team: m.combat.team,
          health: m.combat.health,
          player: m.player,
          interact:
            m.interacting &&
            this.tick - m.interactedAt <= network.inputTimeoutTicks,
        })),
      );
      if (previousObjective.action) {
        const actor = this.members.get(previousObjective.action.actor);
        const reward =
          !previousObjective.position && objective.position
            ? economyRules.plantReward
            : !previousObjective.defused && objective.defused
              ? economyRules.defuseReward
              : 0;
        if (actor?.economy && reward)
          actor.economy = credit(actor.economy, reward);
      }
      this.round = { ...this.round, objective };
    }
    this.updateRound();
    if (this.tick % network.snapshotEvery === 0) {
      const snapshot: Snapshot = {
        tick: this.tick,
        ...(this.round ? { round: this.round } : {}),
        players: Array.from(this.members, ([id, m]) => ({
          id,
          squad: m.squad,
          ...(m.economy ? { economy: m.economy } : {}),
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
    if (m.economy) {
      const freshHalf =
        this.round?.phase === "waiting" || this.round?.phase === "halftime";
      if (freshHalf) m.economy = createEconomy();
      m.combat.armor = !freshHalf && previous.health > 0 ? previous.armor : 0;
      m.combat.loadout = createLoadout(
        !freshHalf && previous.health > 0 ? previous.loadout.owned : ["pistol"],
      );
    }
    m.player = this.spawn(previous.team);
    m.yaw = previous.team === "Attackers" ? 0 : Math.PI;
    m.interacting = false;
    m.queue = [];
    m.acknowledged = m.input.sequence;
  }
  private updateRound() {
    if (!this.round) return;
    const next = advanceRound(
      this.round,
      this.tick,
      Array.from(this.members.values(), (m) => m.combat),
      this.rules,
    );
    if (next === this.round) return;
    if (next.phase === "ending" && this.round.phase !== "ending")
      for (const m of this.members.values())
        if (m.economy)
          m.economy = rewardRound(m.economy, m.combat.team === next.winner);
    this.round = next;
    if (next.phase === "finished") void this.lock();
    for (const m of this.members.values())
      m.combat.team = sideForSquad(m.squad, next.swapped);
    if (next.phase === "freeze")
      this.round = {
        ...next,
        objective: createObjective(
          Array.from(this.members).find(
            ([, m]) => m.combat.team === "Attackers",
          )?.[0] ?? null,
        ),
      };
    for (const m of this.members.values()) {
      m.interacting = false;
      m.queue = [];
      m.acknowledged = m.input.sequence;
      m.player = { ...m.player, vx: 0, vy: 0, vz: 0 };
      if (
        next.phase === "freeze" ||
        next.phase === "waiting" ||
        next.phase === "halftime"
      )
        this.resetMember(m);
    }
  }
  private spawn(team: Team): Player {
    return { ...spawnPlayer(), x: 2, z: team === "Attackers" ? -16 : -12 };
  }
  onJoin(client: Client) {
    const squad: Squad = Array.from(this.members.values()).some(
      (m) => m.squad === "Alpha",
    )
      ? "Bravo"
      : "Alpha";
    const team = sideForSquad(squad, this.round?.swapped ?? false);
    this.members.set(client.sessionId, {
      squad,
      ...(this.round ? { economy: createEconomy() } : {}),
      player: this.spawn(team),
      combat: {
        ...createCombat(team),
        loadout: createLoadout(this.round ? ["pistol"] : ["pistol", "rifle"]),
      },
      yaw: team === "Attackers" ? 0 : Math.PI,
      input: { ...idleInput, sequence: 0 },
      receivedAt: this.tick,
      queue: [],
      acknowledged: 0,
      interacting: false,
      interactedAt: -1000,
    });
  }
  onLeave(client: Client) {
    this.members.delete(client.sessionId);
  }
}

export class RoundRoom extends MovementRoom {
  protected round: RoundState | undefined = createRound();
}
