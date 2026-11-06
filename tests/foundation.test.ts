import { expect, it } from "vitest";
import { range, walk } from "@dp/game-config";
it("normalizes diagonal input and rotates forward into the aim direction", () => {
  const p = walk({ x: 0, z: 0 }, 1, 1, 0, 0.05);
  expect(Math.hypot(p.x, p.z)).toBeCloseTo(range.speed * 0.05);
  expect(walk({ x: 0, z: 0 }, 1, 0, Math.PI / 2, 0.05).x).toBeCloseTo(
    range.speed * 0.05,
  );
});
it("blocks cover entry and allows movement along its face", () => {
  const p = { x: -5, z: -5.85 };
  const next = walk(p, 1, 1, 0, 0.05);
  expect(next.z).toBe(p.z);
  expect(next.x).toBeGreaterThan(p.x);
});
it("keeps a player inside the range after a stalled frame", () => {
  const p = { x: 0, z: 21.65 };
  expect(walk(p, 1, 0, 0, 10)).toEqual(p);
});
