import { expect, it } from "vitest";
import { advancePlayer, spawnPlayer, movement, range } from "@dp/game-config";
const idle = {
  forward: 0,
  right: 0,
  yaw: 0,
  jump: false,
  walk: false,
  crouch: false,
};
function ticks(
  count: number,
  intent: Partial<typeof idle>,
  player = spawnPlayer(),
) {
  for (let i = 0; i < count; i++)
    player = advancePlayer(player, { ...idle, ...intent });
  return player;
}
it("accelerates, brakes and caps diagonal speed", () => {
  const first = ticks(1, { forward: 1, right: 1 });
  expect(Math.hypot(first.vx, first.vz)).toBeCloseTo(
    movement.tick * movement.acceleration,
  );
  const run = ticks(20, { forward: 1, right: 1 });
  expect(Math.hypot(run.vx, run.vz)).toBeCloseTo(range.speed);
  const stopped = ticks(20, {}, run);
  expect(stopped.vx).toBe(0);
  expect(stopped.vz).toBe(0);
});
it("moves in the aim direction at walk and crouch speeds", () => {
  expect(
    ticks(20, { forward: 1, yaw: Math.PI / 2, walk: true }).vx,
  ).toBeCloseTo(movement.walkSpeed);
  const crouched = ticks(20, { right: 1, walk: true, crouch: true });
  expect(crouched.crouched).toBe(true);
  expect(crouched.vx).toBeCloseTo(movement.crouchSpeed);
});
it("retains momentum in air, rejects a second jump, and lands", () => {
  const run = ticks(20, { right: 1 });
  const rising = ticks(1, { jump: true }, run);
  expect(rising.y).toBeGreaterThan(0);
  expect(ticks(1, { jump: true }, rising)).toEqual(ticks(1, {}, rising));
  expect(ticks(1, {}, rising).vx).toBe(run.vx);
  expect(ticks(60, {}, rising)).toMatchObject({ y: 0, vy: 0, grounded: true });
});
it("steps up a curb, blocks the higher ledge and lands on it after a jump", () => {
  const curb = ticks(150, { forward: 1 });
  expect(curb.y).toBe(0.24);
  const jump = ticks(1, { forward: 1, jump: true }, curb);
  const ledge = ticks(36, { forward: 1 }, jump);
  expect(ledge).toMatchObject({ y: 0.85, grounded: true });
  expect(ticks(70, { forward: 1 }, ledge)).toMatchObject({
    y: 0,
    grounded: true,
  });
});
it("slides along freight and stops at the outer wall", () => {
  const p = { ...spawnPlayer(), x: -5, z: -5.85 };
  const slide = ticks(1, { forward: 1, right: 1 }, p);
  expect(slide.z).toBe(p.z);
  expect(slide.x).toBeGreaterThan(p.x);
  const wall = ticks(500, { right: 1 });
  expect(wall.x).toBeLessThanOrEqual(range.width / 2 - range.radius);
  expect(wall.vx).toBe(0);
});
