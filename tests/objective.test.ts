import { expect, it } from "vitest";
import {
  advanceObjective,
  createObjective,
  objectiveRules,
  objectiveSites,
  siteAt,
  spawnPlayer,
  advanceRound,
  createRound,
  type RoundState,
  type ObjectiveActor,
} from "@dp/game-config";
import { idleInput, isInput } from "@dp/protocol";
const actor: ObjectiveActor = {
  id: "a",
  team: "Attackers",
  health: 100,
  player: { ...spawnPlayer(), x: 8, z: -16 },
  interact: true,
};
const roster = [
  { team: "Attackers" as const, health: 100 },
  { team: "Defenders" as const, health: 100 },
];
function plant() {
  const start = advanceObjective(createObjective("a"), 10, "active", [actor]);
  return advanceObjective(start, 310, "active", [actor]);
}
function plantedRound(): RoundState {
  return advanceRound(
    { ...createRound(), phase: "active", endsAt: 6900, objective: plant() },
    310,
    roster,
  );
}
it("requires alive stationary grounded carriers inside either site for a full five-second plant", () => {
  for (const site of objectiveSites) {
    const a = { ...actor, player: { ...actor.player, x: site.x, z: site.z } };
    const start = advanceObjective(createObjective("a"), 0, "active", [a]);
    expect(advanceObjective(start, 299, "active", [a]).position).toBeNull();
    expect(advanceObjective(start, 300, "active", [a])).toMatchObject({
      carrier: null,
      site: site.id,
      position: { x: site.x, z: site.z },
    });
  }
  const invalid = [
    { ...actor, health: 0 },
    { ...actor, team: "Defenders" as const },
    { ...actor, id: "not-carrier" },
    { ...actor, interact: false },
    { ...actor, player: { ...actor.player, x: 0 } },
    { ...actor, player: { ...actor.player, grounded: false } },
    { ...actor, player: { ...actor.player, vx: 2 } },
  ];
  for (const a of invalid)
    expect(
      advanceObjective(createObjective("a"), 0, "active", [a]).action,
    ).toBeNull();
  expect(
    advanceObjective(createObjective("a"), 0, "freeze", [actor]).action,
  ).toBeNull();
});
it("release, movement, leaving a site, death or a missing actor cancels progress", () => {
  const start = advanceObjective(createObjective("a"), 0, "active", [actor]);
  for (const actors of [
    [],
    [{ ...actor, interact: false }],
    [{ ...actor, health: 0 }],
    [{ ...actor, player: { ...actor.player, vx: 1 } }],
    [{ ...actor, player: { ...actor.player, x: 12 } }],
  ]) {
    const cancelled = advanceObjective(start, 200, "active", actors);
    expect(cancelled.action).toBeNull();
    const resumed = advanceObjective(cancelled, 201, "active", [actor]);
    expect(
      advanceObjective(resumed, 300, "active", [actor]).position,
    ).toBeNull();
  }
});
it("requires a living nearby defender and ten uninterrupted seconds to defuse", () => {
  const planted = plant();
  const defender: ObjectiveActor = { ...actor, id: "d", team: "Defenders" };
  expect(advanceObjective(planted, 400, "planted", [actor]).action).toBeNull();
  expect(
    advanceObjective(planted, 400, "planted", [
      { ...defender, player: { ...actor.player, x: 11 } },
    ]).action,
  ).toBeNull();
  const start = advanceObjective(planted, 400, "planted", [defender]);
  expect(advanceObjective(start, 999, "planted", [defender]).defused).toBe(
    false,
  );
  expect(advanceObjective(start, 1000, "planted", [defender]).defused).toBe(
    true,
  );
  expect(
    advanceObjective(start, 600, "planted", [{ ...defender, health: 0 }])
      .action,
  ).toBeNull();
  expect(
    advanceObjective(start, 600, "planted", [{ ...defender, interact: false }])
      .action,
  ).toBeNull();
  expect(
    advanceObjective(start, 600, "planted", [
      { ...defender, player: { ...actor.player, x: 11 } },
    ]).action,
  ).toBeNull();
});
it("planting replaces the round clock, and elimination after planting does not stop the fuse", () => {
  const state = plantedRound();
  expect(state).toMatchObject({
    phase: "planted",
    endsAt: 310 + objectiveRules.fuseTicks,
  });
  for (const players of [
    [{ ...roster[0], health: 0 }, roster[1]],
    [roster[0], { ...roster[1], health: 0 }],
  ])
    expect(advanceRound(state, 690, players)).toBe(state);
  expect(advanceRound(state, state.endsAt!, roster)).toMatchObject({
    phase: "ending",
    winner: "Attackers",
    reason: "detonated",
    score: { Alpha: 1, Bravo: 0 },
  });
});
it("defuse awards one point; explosion wins an exact deadline tie; reset clears the device", () => {
  const state = plantedRound();
  const defused = {
    ...state,
    objective: { ...state.objective!, defused: true },
  };
  const end = advanceRound(defused, state.endsAt! - 1, roster);
  expect(end).toMatchObject({
    winner: "Defenders",
    reason: "defused",
    score: { Alpha: 0, Bravo: 1 },
  });
  expect(advanceRound(end, state.endsAt!, roster)).toBe(end);
  expect(advanceRound(defused, state.endsAt!, roster).reason).toBe("detonated");
  expect(advanceRound(end, end.endsAt!, roster)).toMatchObject({
    phase: "freeze",
    objective: null,
  });
  expect(advanceRound(state, 500, roster.slice(0, 1)).objective).toBeNull();
});
it("unplanted timeout takes precedence over a last-tick plant", () => {
  const state = {
    ...createRound(),
    phase: "active" as const,
    endsAt: 300,
    objective: plant(),
  };
  expect(advanceRound(state, 300, roster)).toMatchObject({
    phase: "ending",
    reason: "timeout",
  });
});
it("accepts only interaction intent, never client-submitted objective outcomes", () => {
  expect(isInput({ ...idleInput, sequence: 1, interact: true })).toBe(true);
  for (const extra of [
    { interact: 1 },
    { planted: true },
    { defused: true },
    { site: "A" },
  ])
    expect(isInput({ ...idleInput, sequence: 1, ...extra })).toBe(false);
});

it("planting bounds match the painted square, including its corners", () => {
  expect(siteAt({ ...actor.player, x: 10, z: -14 })?.id).toBe("A");
  expect(siteAt({ ...actor.player, x: 10.01, z: -14 })).toBeUndefined();
});
