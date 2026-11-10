import { expect, it } from "vitest";
import { createRound } from "@dp/game-config";
import { spectatorPose } from "../apps/client/src/spectator";

it("spectates only eliminated players in live/ending rounds", () => {
  const round = { ...createRound(), phase: "active" as const };
  expect(spectatorPose(undefined, 0, "auto")).toBeNull();
  expect(spectatorPose(round, 100, "auto")).toBeNull();
  for (const phase of [
    "waiting",
    "warmup",
    "freeze",
    "halftime",
    "finished",
  ] as const)
    expect(spectatorPose({ ...round, phase }, 0, "auto")).toBeNull();
  for (const phase of ["active", "planted", "ending"] as const)
    expect(spectatorPose({ ...round, phase }, 0, "auto")?.label).toBe(
      "Watching Foundry",
    );
});
it("auto watches the planted position while explicit views remain fixed", () => {
  const round = {
    ...createRound(),
    phase: "planted" as const,
    objective: {
      carrier: null,
      site: "A",
      position: { x: 7.5, y: 0, z: -15 },
      action: null,
      defused: false,
    },
  };
  expect(spectatorPose(round, 0, "auto")).toMatchObject({
    target: round.objective.position,
    label: "Watching objective at Site A",
  });
  expect(spectatorPose(round, 0, "foundry")?.target).toEqual({
    x: 0,
    y: 0,
    z: -2,
  });
  expect(spectatorPose(round, 0, "A")?.target).toEqual({ x: 8, y: 0, z: -16 });
  expect(spectatorPose(round, 0, "B")?.target).toEqual({ x: -10, y: 0, z: 8 });
  expect(spectatorPose({ ...round, objective: null }, 0, "auto")?.label).toBe(
    "Watching Foundry",
  );
});
