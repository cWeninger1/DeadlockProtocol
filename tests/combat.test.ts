import { expect, it } from "vitest";
import { spawnPlayer, tracePlayerShot } from "@dp/game-config";
import { idleInput, isInput } from "@dp/protocol";
const shooter = { ...spawnPlayer(), x: 2 };
const target = { id: "near", player: { ...shooter, z: -12 } };
it("hits the nearest body and respects range, aim and crouch height", () => {
  const far = { id: "far", player: { ...shooter, z: -10 } };
  expect(tracePlayerShot(shooter, 0, 0, 50, [far, target])).toBe("near");
  expect(tracePlayerShot(shooter, 0, 0, 2, [target])).toBeUndefined();
  expect(tracePlayerShot(shooter, Math.PI, 0, 50, [target])).toBeUndefined();
  const crouched = { ...target, player: { ...target.player, crouched: true } };
  expect(tracePlayerShot(shooter, 0, 0, 50, [crouched])).toBeUndefined();
  expect(tracePlayerShot(shooter, 0, 0.2, 50, [crouched])).toBe("near");
});
it("freight blocks shots before players, but elevated shots clear it", () => {
  const origin = { ...shooter, x: -5, z: -8 };
  const behind = { id: "behind", player: { ...origin, z: 0 } };
  expect(tracePlayerShot(origin, 0, 0, 50, [behind])).toBeUndefined();
  expect(
    tracePlayerShot({ ...origin, y: 4 }, 0, 0, 50, [
      { ...behind, player: { ...behind.player, y: 4 } },
    ]),
  ).toBe("behind");
});
it("accepts bounded combat intent and rejects forged results", () => {
  const input = {
    ...idleInput,
    sequence: 1,
    combat: {
      pitch: 0,
      pressed: true,
      held: true,
      reload: false,
      weapon: null,
      life: 0,
    },
  };
  expect(isInput(input)).toBe(true);
  for (const invalid of [
    { damage: 100 },
    { pitch: NaN },
    { pitch: 2 },
    { life: -1 },
    { weapon: "rocket" },
  ])
    expect(isInput({ ...input, combat: { ...input.combat, ...invalid } })).toBe(
      false,
    );
  expect(isInput({ ...input, health: 100 })).toBe(false);
});
