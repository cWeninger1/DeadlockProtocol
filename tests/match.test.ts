import { expect, it } from "vitest";
import {
  advanceRound,
  createRound,
  roundRules,
  sideForSquad,
  squadForSide,
  type RoundState,
  type Squad,
} from "@dp/game-config";

const alive = [
  { team: "Attackers" as const, health: 100 },
  { team: "Defenders" as const, health: 100 },
];
function start() {
  let s = advanceRound(createRound(), 0, alive);
  s = advanceRound(s, s.endsAt!, alive);
  return advanceRound(s, s.endsAt!, alive);
}
function win(s: RoundState, squad: Squad) {
  const side = sideForSquad(squad, s.swapped);
  const dead = alive.map((p) => ({ ...p, health: p.team === side ? 100 : 0 }));
  return advanceRound(s, s.endsAt! - 1, dead);
}
function next(s: RoundState) {
  s = advanceRound(s, s.endsAt!, alive);
  if (s.phase === "halftime") s = advanceRound(s, s.endsAt!, alive);
  if (s.phase === "freeze") s = advanceRound(s, s.endsAt!, alive);
  return s;
}
it("swaps sides once after round 12, retaining squad scores and starting round 13", () => {
  let s = start();
  for (let i = 0; i < 11; i++) s = next(win(s, "Alpha"));
  const ending = win(s, "Alpha");
  const half = advanceRound(ending, ending.endsAt!, alive);
  expect(half).toMatchObject({
    phase: "halftime",
    number: 12,
    swapped: true,
    score: { Alpha: 12, Bravo: 0 },
  });
  expect(advanceRound(half, half.endsAt! - 1, alive)).toBe(half);
  const freeze = advanceRound(half, half.endsAt!, alive);
  expect(freeze).toMatchObject({
    phase: "freeze",
    number: 13,
    swapped: true,
    score: half.score,
  });
  expect(sideForSquad("Alpha", true)).toBe("Defenders");
  expect(squadForSide("Attackers", true)).toBe("Bravo");
});
it("ends at thirteen wins without transferring points to the opposing squad after halftime", () => {
  let s = start();
  for (let i = 0; i < 13; i++) s = next(win(s, "Alpha"));
  expect(s).toMatchObject({
    phase: "finished",
    number: 13,
    matchWinner: "Alpha",
    score: { Alpha: 13, Bravo: 0 },
    endsAt: null,
    objective: null,
  });
  expect(advanceRound(s, 999999, alive)).toBe(s);
  expect(advanceRound(s, 999999, [])).toBe(s);
});
it("finishes a 24-round regulation tie as a draw and never starts round 25", () => {
  let s = start();
  for (let i = 0; i < 24; i++)
    s = next(win(s, i % 2 === 0 ? "Alpha" : "Bravo"));
  expect(s).toMatchObject({
    phase: "finished",
    number: 24,
    matchWinner: "draw",
    score: { Alpha: 12, Bravo: 12 },
  });
});
it("awards post-halftime timeout and objective outcomes to stable squads", () => {
  const s = { ...start(), swapped: true };
  expect(advanceRound(s, s.endsAt!, alive).score).toEqual({
    Alpha: 1,
    Bravo: 0,
  });
  const planted: RoundState = {
    ...s,
    phase: "planted",
    objective: {
      carrier: null,
      site: "A",
      position: { x: 8, y: 0, z: -16 },
      action: null,
      defused: true,
    },
  };
  expect(advanceRound(planted, planted.endsAt! - 1, alive).score).toEqual({
    Alpha: 1,
    Bravo: 0,
  });
  expect(advanceRound(planted, planted.endsAt!, alive).score).toEqual({
    Alpha: 0,
    Bravo: 1,
  });
});
it("aborts a disconnected half into a fresh first half, while completed results remain terminal", () => {
  const s = {
    ...start(),
    phase: "halftime" as const,
    swapped: true,
    score: { Alpha: 7, Bravo: 5 },
  };
  const waiting = advanceRound(s, 2000, alive.slice(0, 1));
  expect(waiting).toMatchObject({
    phase: "waiting",
    swapped: false,
    number: 0,
    score: { Alpha: 0, Bravo: 0 },
  });
  expect(roundRules).toMatchObject({ roundsPerHalf: 12, roundsToWin: 13 });
  expect(createRound().format).toEqual({ roundsPerHalf: 12, roundsToWin: 13 });
});
