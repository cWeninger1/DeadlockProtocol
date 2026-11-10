import { expect, test } from "vitest";
import {
  buyRestriction,
  createEconomy,
  createLoadout,
  createRound,
  credit,
  economyRules,
  rewardRound,
  spawnPlayer,
  switchWeapon,
  tradeRifle,
} from "@dp/game-config";
import { isBuyRequest } from "@dp/protocol";

test("rewards cap money, progress losses and reset the streak on victory", () => {
  let e = createEconomy();
  expect(e.money).toBe(800);
  for (const reward of [1400, 1900, 2400, 2900, 3400, 3400]) {
    const previous = e.money;
    e = rewardRound(e, false);
    expect(e.money).toBe(Math.min(16000, previous + reward));
  }
  expect(e.losses).toBe(5);
  e = rewardRound(e, true);
  expect(e.losses).toBe(0);
  expect(e.money).toBe(16000);
  expect(credit(createEconomy(), 300).money).toBe(1100);
});

test("rifle purchase is atomic, ownership is enforced and refunds cannot mint money", () => {
  const loadout = createLoadout(["pistol"]);
  const poor = createEconomy();
  expect(tradeRifle(poor, loadout, 2, 10, "buy").error).toContain("Not enough");
  expect(switchWeapon(loadout, "rifle", 10)).toBe(loadout);
  const funded = credit(poor, 3250);
  const bought = tradeRifle(funded, loadout, 2, 10, "buy");
  expect(bought.economy!.money).toBe(1350);
  expect(bought.loadout!.owned).toEqual(["pistol", "rifle"]);
  expect(
    tradeRifle(bought.economy!, bought.loadout!, 2, 10, "buy").error,
  ).toContain("already own");
  expect(
    tradeRifle(bought.economy!, bought.loadout!, 3, 10, "refund").error,
  ).toContain("this freeze");
  const equipped = switchWeapon(bought.loadout!, "rifle", 11);
  const refunded = tradeRifle(bought.economy!, equipped, 2, 12, "refund");
  expect(refunded.economy!.money).toBe(funded.money);
  expect(refunded.loadout!.active).toBe("pistol");
  expect(refunded.loadout!.owned).toEqual(["pistol"]);
  expect(
    tradeRifle(refunded.economy!, refunded.loadout!, 2, 13, "refund").error,
  ).toBeTruthy();
  expect(funded.money).toBe(4050);
});

test("buy eligibility is restricted to living players at their own spawn before freeze deadline", () => {
  const round = { ...createRound(), phase: "freeze" as const, endsAt: 100 };
  const p = { ...spawnPlayer(), x: 2, z: -16 };
  expect(buyRestriction(round, 99, 100, "Attackers", p)).toBeNull();
  expect(buyRestriction(round, 100, 100, "Attackers", p)).toBeTruthy();
  expect(buyRestriction(round, 99, 0, "Attackers", p)).toBeTruthy();
  expect(buyRestriction(round, 99, 100, "Defenders", p)).toBeTruthy();
  expect(
    buyRestriction(round, 99, 100, "Attackers", {
      ...p,
      x: 2 + economyRules.buyRadius + 0.01,
    }),
  ).toBeTruthy();
  for (const phase of [
    "waiting",
    "warmup",
    "active",
    "planted",
    "ending",
    "halftime",
    "finished",
  ] as const)
    expect(
      buyRestriction({ ...round, phase }, 0, 100, "Attackers", p),
    ).toBeTruthy();
});

test("purchase messages reject forged prices, currency, invalid generations and unknown equipment", () => {
  const request = { action: "buy", item: "rifle", epoch: 2, life: 1 };
  expect(isBuyRequest(request)).toBe(true);
  for (const value of [
    null,
    {},
    { ...request, money: 16000 },
    { ...request, price: 0 },
    { ...request, item: "kit" },
    { ...request, epoch: -1 },
    { ...request, life: NaN },
    { ...request, action: "sell" },
  ])
    expect(isBuyRequest(value)).toBe(false);
});
