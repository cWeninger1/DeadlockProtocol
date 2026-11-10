import { expect, it } from "vitest";
import {
  advanceRound,
  createRound,
  roundRules,
  type RoundPlayer,
} from "@dp/game-config";
import { idleInput, isInput } from "@dp/protocol";
const roster: RoundPlayer[] = [
  { team: "Attackers", health: 100 },
  { team: "Defenders", health: 100 },
];
const rules = {
  ...roundRules,
  warmupTicks: 5,
  freezeTicks: 20,
  activeTicks: 115,
  endingTicks: 5,
};
function active() {
  let state = advanceRound(createRound(), 0, roster, rules);
  state = advanceRound(state, 5, roster, rules);
  return advanceRound(state, 25, roster, rules);
}
it("waits for both teams and honors exact warmup, freeze and active deadlines", () => {
  const initial = createRound();
  expect(advanceRound(initial, 100, roster.slice(0, 1), rules)).toBe(initial);
  const warmup = advanceRound(initial, 100, roster, rules);
  expect(warmup).toMatchObject({ phase: "warmup", endsAt: 105 });
  expect(advanceRound(warmup, 104, roster, rules)).toBe(warmup);
  const freeze = advanceRound(warmup, 105, roster, rules);
  expect(freeze).toMatchObject({ phase: "freeze", number: 1, endsAt: 125 });
  expect(advanceRound(freeze, 124, roster, rules)).toBe(freeze);
  expect(advanceRound(freeze, 125, roster, rules)).toMatchObject({
    phase: "active",
    endsAt: 240,
  });
  expect(roundRules.freezeTicks).toBe(1200);
  expect(roundRules.activeTicks).toBe(6900);
});
it("awards elimination only once and starts the next round with preserved team score", () => {
  const state = active();
  const dead = [
    { team: "Attackers" as const, health: 100 },
    { team: "Defenders" as const, health: 0 },
  ];
  const ending = advanceRound(state, 30, dead, rules);
  expect(ending).toMatchObject({
    phase: "ending",
    winner: "Attackers",
    reason: "elimination",
    score: { Alpha: 1, Bravo: 0 },
  });
  expect(advanceRound(ending, 31, dead, rules)).toBe(ending);
  expect(advanceRound(ending, 35, dead, rules)).toMatchObject({
    phase: "freeze",
    number: 2,
    winner: null,
    score: ending.score,
  });
});
it("awards defenders on timeout before evaluating an expiry-tick elimination", () => {
  const state = active();
  expect(advanceRound(state, 139, roster, rules)).toBe(state);
  expect(
    advanceRound(
      state,
      140,
      [
        { team: "Attackers", health: 100 },
        { team: "Defenders", health: 0 },
      ],
      rules,
    ),
  ).toMatchObject({ phase: "ending", winner: "Defenders", reason: "timeout" });
  expect(
    advanceRound(
      state,
      30,
      [
        { team: "Attackers", health: 0 },
        { team: "Defenders", health: 100 },
      ],
      rules,
    ).winner,
  ).toBe("Defenders");
});
it("aborts to waiting without awarding a point when either team disconnects", () => {
  for (const state of [active(), advanceRound(active(), 140, roster, rules)]) {
    const waiting = advanceRound(state, 141, roster.slice(0, 1), rules);
    expect(waiting).toMatchObject({
      phase: "waiting",
      number: 0,
      score: { Alpha: 0, Bravo: 0 },
      epoch: state.epoch + 1,
    });
    expect(advanceRound(waiting, 142, roster, rules).phase).toBe("warmup");
  }
});
it("validates phase identifiers as bounded integers", () => {
  expect(isInput({ ...idleInput, sequence: 1, epoch: 3 })).toBe(true);
  for (const epoch of [-1, NaN, Infinity, 0.5, "1"])
    expect(isInput({ ...idleInput, sequence: 1, epoch })).toBe(false);
});
