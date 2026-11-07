import { expect, it } from "vitest";
import {
  createVitals,
  applyHazard,
  hazard,
  damageHealth,
} from "@dp/game-config";
it("bounds lethal damage and ignores invalid damage", () => {
  expect(damageHealth(25, 100)).toBe(0);
  for (const invalid of [-5, NaN, Infinity])
    expect(damageHealth(100, invalid)).toBe(100);
});
it("applies hazard damage once per interval and leaves death terminal", () => {
  const position = { x: hazard.x, y: 0, z: hazard.z };
  const first = applyHazard(createVitals(), position, 0);
  expect(first.health).toBe(75);
  expect(applyHazard(first, position, 1)).toBe(first);
  let state = first;
  for (let i = 1; i < 4; i++)
    state = applyHazard(state, position, i * hazard.intervalTicks);
  expect(state.health).toBe(0);
  expect(applyHazard(state, position, 1000)).toBe(state);
  expect(createVitals().health).toBe(100);
});
it("avoids damage outside the area or while above its floor", () => {
  const state = createVitals();
  expect(applyHazard(state, { x: 0, y: 0, z: hazard.z }, 100)).toBe(state);
  expect(applyHazard(state, { x: hazard.x, y: 1, z: hazard.z }, 100)).toBe(
    state,
  );
});
