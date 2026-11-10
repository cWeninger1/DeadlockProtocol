import { expect, test } from "vitest";
import {
  applyArmorDamage,
  createEconomy,
  rewardRound,
  tradeArmor,
  weapons,
} from "@dp/game-config";
import { isBuyRequest } from "@dp/protocol";

test("weapon penetration controls damage and consumes only available armor", () => {
  expect(
    applyArmorDamage(
      100,
      100,
      weapons.pistol.damage,
      weapons.pistol.penetration,
    ),
  ).toEqual({ health: 87, armor: 88 });
  expect(
    applyArmorDamage(100, 100, weapons.rifle.damage, weapons.rifle.penetration),
  ).toEqual({ health: 76, armor: 90 });
  expect(applyArmorDamage(100, 5, 25, 0.5)).toEqual({ health: 80, armor: 0 });
  expect(applyArmorDamage(100, 0, 25, 0.5)).toEqual({ health: 75, armor: 0 });
  expect(applyArmorDamage(4, 0, 25, 0.5)).toEqual({ health: 0, armor: 0 });
  expect(applyArmorDamage(100, 100, 25, 1)).toEqual({ health: 75, armor: 100 });
});
test("armor purchase and refund preserve money and pre-existing armor", () => {
  for (const armor of [0, 17, 88]) {
    const initial = createEconomy();
    const buy = tradeArmor(initial, armor, 2, "buy");
    expect(buy.economy!.money).toBe(150);
    expect(buy.armor).toBe(100);
    expect(tradeArmor(buy.economy!, 100, 2, "buy").error).toContain("full");
    expect(tradeArmor(buy.economy!, 100, 3, "refund").error).toBeTruthy();
    expect(tradeArmor(buy.economy!, 88, 2, "refund").error).toBeTruthy();
    const refund = tradeArmor(buy.economy!, 100, 2, "refund");
    expect(refund.armor).toBe(armor);
    expect(refund.economy!.money).toBe(800);
    expect(tradeArmor(refund.economy!, armor, 2, "refund").error).toBeTruthy();
    expect(
      tradeArmor({ ...initial, money: 649 }, armor, 2, "buy").error,
    ).toContain("Not enough");
    expect(rewardRound(buy.economy!, false).armorPurchase).toBeNull();
  }
});
test("armor requests cannot specify armor quantity, price or damage reduction", () => {
  const valid = { item: "armor", action: "buy", epoch: 2, life: 1 };
  expect(isBuyRequest(valid)).toBe(true);
  for (const field of ["armor", "price", "penetration"])
    expect(isBuyRequest({ ...valid, [field]: 999 })).toBe(false);
});
