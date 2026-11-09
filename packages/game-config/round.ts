import { objectiveRules, type ObjectiveState } from "./objective";
import type { Team } from "./combat";
import { movement } from "./settings";

export const roundRules = {
  warmupTicks: 5 / movement.tick,
  freezeTicks: 20 / movement.tick,
  activeTicks: 115 / movement.tick,
  endingTicks: 5 / movement.tick,
};
export type RoundRules = typeof roundRules;
export type RoundPhase =
  "waiting" | "warmup" | "freeze" | "active" | "planted" | "ending";
export type RoundState = {
  objective: ObjectiveState | null;
  phase: RoundPhase;
  epoch: number;
  number: number;
  endsAt: number | null;
  winner: Team | null;
  reason: "elimination" | "timeout" | "defused" | "detonated" | null;
  score: Record<Team, number>;
};
export type RoundPlayer = { team: Team; health: number };
export const roundLabels: Record<RoundPhase, string> = {
  waiting: "Waiting for players",
  warmup: "Warmup",
  freeze: "Freeze time",
  active: "Round active",
  ending: "Round ending",
  planted: "Objective planted",
};
export function createRound(epoch = 0): RoundState {
  return {
    objective: null,
    phase: "waiting",
    epoch,
    number: 0,
    endsAt: null,
    winner: null,
    reason: null,
    score: { Attackers: 0, Defenders: 0 },
  };
}
// Pure transitions: the room applies spawn resets when entering freeze/waiting.
export function advanceRound(
  state: RoundState,
  tick: number,
  players: RoundPlayer[],
  rules: RoundRules = roundRules,
): RoundState {
  const hasTeams =
    players.some((p) => p.team === "Attackers") &&
    players.some((p) => p.team === "Defenders");
  if (!hasTeams)
    return state.phase === "waiting" ? state : createRound(state.epoch + 1);
  const enter = (phase: RoundPhase, duration: number): RoundState => ({
    ...state,
    phase,
    epoch: state.epoch + 1,
    endsAt: tick + duration,
  });
  if (state.phase === "waiting") return enter("warmup", rules.warmupTicks);
  if (state.phase === "active") {
    const attackers = players.some(
      (p) => p.team === "Attackers" && p.health > 0,
    );
    const defenders = players.some(
      (p) => p.team === "Defenders" && p.health > 0,
    );
    // The deadline takes priority over shots arriving on the expiry tick.
    const timeout = tick >= state.endsAt!;
    const winner: Team | null =
      timeout || !attackers ? "Defenders" : !defenders ? "Attackers" : null;
    if (!winner)
      return state.objective?.position
        ? enter("planted", objectiveRules.fuseTicks)
        : state;
    return {
      ...enter("ending", rules.endingTicks),
      winner,
      reason: timeout ? "timeout" : "elimination",
      score: { ...state.score, [winner]: state.score[winner] + 1 },
    };
  }
  if (state.phase === "planted") {
    const expired = tick >= state.endsAt!;
    if (!expired && !state.objective?.defused) return state;
    const winner: Team = expired ? "Attackers" : "Defenders";
    return {
      ...enter("ending", rules.endingTicks),
      winner,
      reason: expired ? "detonated" : "defused",
      score: { ...state.score, [winner]: state.score[winner] + 1 },
    };
  }
  if (tick < state.endsAt!) return state;
  if (state.phase === "warmup" || state.phase === "ending")
    return {
      ...enter("freeze", rules.freezeTicks),
      objective: null,
      number: state.number + 1,
      winner: null,
      reason: null,
    };
  return enter("active", rules.activeTicks);
}
