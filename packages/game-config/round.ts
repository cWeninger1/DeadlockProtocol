import { objectiveRules, type ObjectiveState } from "./objective";
import type { Team } from "./combat";
import { movement } from "./settings";

export const roundRules = {
  warmupTicks: 5 / movement.tick,
  freezeTicks: 20 / movement.tick,
  activeTicks: 115 / movement.tick,
  endingTicks: 5 / movement.tick,
  halftimeTicks: 10 / movement.tick,
  roundsPerHalf: 12,
  roundsToWin: 13,
};
export type RoundRules = typeof roundRules;
export type Squad = "Alpha" | "Bravo";
export function sideForSquad(squad: Squad, swapped: boolean): Team {
  return (squad === "Alpha") !== swapped ? "Attackers" : "Defenders";
}
export function squadForSide(side: Team, swapped: boolean): Squad {
  return (side === "Attackers") !== swapped ? "Alpha" : "Bravo";
}
export type RoundPhase =
  | "waiting"
  | "warmup"
  | "freeze"
  | "active"
  | "planted"
  | "ending"
  | "halftime"
  | "finished";
export type RoundState = {
  swapped: boolean;
  matchWinner: Squad | "draw" | null;
  format: { roundsPerHalf: number; roundsToWin: number };
  objective: ObjectiveState | null;
  phase: RoundPhase;
  epoch: number;
  number: number;
  endsAt: number | null;
  winner: Team | null;
  reason: "elimination" | "timeout" | "defused" | "detonated" | null;
  score: Record<Squad, number>;
};
export type RoundPlayer = { team: Team; health: number };
export const roundLabels: Record<RoundPhase, string> = {
  waiting: "Waiting for players",
  warmup: "Warmup",
  freeze: "Freeze time",
  active: "Round active",
  ending: "Round ending",
  planted: "Objective planted",
  halftime: "Halftime - sides switched",
  finished: "Match finished",
};
export function createRound(
  epoch = 0,
  rules: RoundRules = roundRules,
): RoundState {
  return {
    swapped: false,
    matchWinner: null,
    format: {
      roundsPerHalf: rules.roundsPerHalf,
      roundsToWin: rules.roundsToWin,
    },
    objective: null,
    phase: "waiting",
    epoch,
    number: 0,
    endsAt: null,
    winner: null,
    reason: null,
    score: { Alpha: 0, Bravo: 0 },
  };
}
// Pure transitions: the room applies spawn resets when entering freeze/waiting.
export function advanceRound(
  state: RoundState,
  tick: number,
  players: RoundPlayer[],
  rules: RoundRules = roundRules,
): RoundState {
  if (state.phase === "finished") return state;
  const hasTeams =
    players.some((p) => p.team === "Attackers") &&
    players.some((p) => p.team === "Defenders");
  if (!hasTeams)
    return state.phase === "waiting"
      ? state
      : createRound(state.epoch + 1, rules);
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
      score: {
        ...state.score,
        [squadForSide(winner, state.swapped)]:
          state.score[squadForSide(winner, state.swapped)] + 1,
      },
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
      score: {
        ...state.score,
        [squadForSide(winner, state.swapped)]:
          state.score[squadForSide(winner, state.swapped)] + 1,
      },
    };
  }
  if (tick < state.endsAt!) return state;
  if (state.phase === "ending") {
    const { Alpha, Bravo } = state.score;
    if (
      Math.max(Alpha, Bravo) >= rules.roundsToWin ||
      state.number >= rules.roundsPerHalf * 2
    )
      return {
        ...enter("finished", 0),
        endsAt: null,
        objective: null,
        matchWinner:
          Alpha === Bravo ? "draw" : Alpha > Bravo ? "Alpha" : "Bravo",
      };
    if (!state.swapped && state.number === rules.roundsPerHalf)
      return {
        ...enter("halftime", rules.halftimeTicks),
        swapped: true,
        objective: null,
        winner: null,
        reason: null,
      };
  }
  if (
    state.phase === "warmup" ||
    state.phase === "ending" ||
    state.phase === "halftime"
  )
    return {
      ...enter("freeze", rules.freezeTicks),
      objective: null,
      number: state.number + 1,
      winner: null,
      reason: null,
    };
  return enter("active", rules.activeTicks);
}
