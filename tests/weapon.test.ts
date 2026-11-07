import {
  createLoadout,
  switchWeapon,
  advanceLoadout,
  rangeRifle,
} from "@dp/game-config";
import { expect, it } from "vitest";
import { equipWeapon, rangePistol as def, updateWeapon } from "@dp/game-config";
it("enforces the firing interval and rejects an empty magazine", () => {
  const oneRound = { ...equipWeapon(def), magazine: 2 };
  const shot = updateWeapon(def, oneRound, 1, true, false);
  expect(shot.magazine).toBe(1);
  expect(updateWeapon(def, shot, def.intervalTicks, true, false)).toBe(shot);
  const empty = updateWeapon(def, shot, 1 + def.intervalTicks, true, false);
  expect(empty.magazine).toBe(0);
  expect(updateWeapon(def, empty, 200, true, false)).toBe(empty);
});
it("blocks firing during reload and transfers only the available reserve once", () => {
  const partial = { ...equipWeapon(def), magazine: 2, reserve: 3 };
  const loading = updateWeapon(def, partial, 1, true, true);
  expect(loading.magazine).toBe(2);
  expect(updateWeapon(def, loading, def.reloadTicks, true, true)).toBe(loading);
  const done = updateWeapon(def, loading, 1 + def.reloadTicks, false, false);
  expect(done).toMatchObject({ magazine: 5, reserve: 0, reloadEnds: null });
  expect(updateWeapon(def, done, 200, false, true)).toBe(done);
});
it("rejects a reload when full and conserves surplus reserve", () => {
  const full = equipWeapon(def);
  expect(updateWeapon(def, full, 1, false, true)).toBe(full);
  const loading = updateWeapon(
    def,
    { ...full, magazine: def.capacity - 1 },
    1,
    false,
    true,
  );
  expect(updateWeapon(def, loading, 100, false, false)).toMatchObject({
    magazine: def.capacity,
    reserve: def.reserve - 1,
  });
});

it("fires a held rifle at its configured cadence and keeps pistol ammunition separate", () => {
  let kit = switchWeapon(createLoadout(), "rifle", 0);
  expect(
    advanceLoadout(kit, rangeRifle.equipTicks - 1, true, true, false),
  ).toBe(kit);
  for (
    let tick = rangeRifle.equipTicks;
    tick < rangeRifle.equipTicks + 60;
    tick++
  )
    kit = advanceLoadout(kit, tick, false, true, false);
  expect(kit.inventory.rifle.magazine).toBe(20);
  expect(kit.inventory.pistol.magazine).toBe(12);
  const released = advanceLoadout(kit, 100, false, false, false);
  expect(released).toBe(kit);
});
it("cancels a holstered reload without moving reserve and enforces every equip delay", () => {
  let kit = switchWeapon(createLoadout(), "rifle", 0);
  kit = advanceLoadout(kit, 24, true, false, false);
  kit = advanceLoadout(kit, 25, false, false, true);
  expect(kit.inventory.rifle.reloadEnds).not.toBeNull();
  kit = switchWeapon(kit, "pistol", 26);
  kit = switchWeapon(kit, "rifle", 200);
  expect(kit.inventory.rifle).toMatchObject({
    magazine: 29,
    reserve: 90,
    reloadEnds: null,
  });
  expect(advanceLoadout(kit, 223, true, true, false)).toBe(kit);
  expect(
    advanceLoadout(kit, 224, true, true, false).inventory.rifle.magazine,
  ).toBe(28);
  expect(switchWeapon(kit, "rifle", 220)).toBe(kit);
});
it("holding the pistol trigger cannot fire additional rounds", () => {
  const shot = advanceLoadout(createLoadout(), 1, true, true, false);
  expect(advanceLoadout(shot, 100, false, true, false)).toBe(shot);
});
