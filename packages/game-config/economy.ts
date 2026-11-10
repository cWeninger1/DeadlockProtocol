import type { Team } from "./combat";
import type { Player } from "./movement";
import type { RoundState } from "./round";
import { equipWeapon, weapons, type Loadout } from "./weapon";

export const economyRules = {
  startingMoney: 800,
  maximumMoney: 16000,
  winReward: 3250,
  lossRewards: [1400, 1900, 2400, 2900, 3400],
  plantReward: 300,
  defuseReward: 300,
  riflePrice: 2700,
  buyRadius: 3,
} as const;
export type EconomyState = {
  money: number;
  losses: number;
  riflePurchaseEpoch: number | null;
};
export function createEconomy(): EconomyState {
  return {
    money: economyRules.startingMoney,
    losses: 0,
    riflePurchaseEpoch: null,
  };
}
export function credit(economy: EconomyState, amount: number): EconomyState {
  return {
    ...economy,
    money: Math.min(economyRules.maximumMoney, economy.money + amount),
  };
}
export function rewardRound(economy: EconomyState, won: boolean): EconomyState {
  const rewards = economyRules.lossRewards;
  return {
    ...credit(
      economy,
      won
        ? economyRules.winReward
        : rewards[Math.min(economy.losses, rewards.length - 1)],
    ),
    losses: won ? 0 : Math.min(economy.losses + 1, rewards.length),
    riflePurchaseEpoch: null,
  };
}
export function buyRestriction(
  round: RoundState | undefined,
  tick: number,
  health: number,
  team: Team,
  player: Player,
): string | null {
  if (!round || round.phase !== "freeze" || tick >= round.endsAt!)
    return "Buying opens during freeze time.";
  if (health <= 0) return "You must be alive to buy.";
  const spawnZ = team === "Attackers" ? -16 : -12;
  if (
    Math.hypot(player.x - 2, player.y, player.z - spawnZ) >
    economyRules.buyRadius
  )
    return "Return to your spawn buy zone.";
  return null;
}
export function tradeRifle(
  economy: EconomyState,
  loadout: Loadout,
  epoch: number,
  tick: number,
  action: "buy" | "refund",
) {
  if (action === "buy") {
    if (loadout.owned.includes("rifle"))
      return { error: "You already own the AR30." };
    if (economy.money < economyRules.riflePrice)
      return { error: "Not enough money for the AR30." };
    return {
      economy: {
        ...economy,
        money: economy.money - economyRules.riflePrice,
        riflePurchaseEpoch: epoch,
      },
      loadout: {
        ...loadout,
        owned: [...loadout.owned, "rifle" as const],
        inventory: { ...loadout.inventory, rifle: equipWeapon(weapons.rifle) },
      },
    };
  }
  if (!loadout.owned.includes("rifle") || economy.riflePurchaseEpoch !== epoch)
    return { error: "Only a rifle bought in this freeze can be refunded." };
  return {
    economy: {
      ...credit(economy, economyRules.riflePrice),
      riflePurchaseEpoch: null,
    },
    loadout: {
      ...loadout,
      owned: loadout.owned.filter((id) => id !== "rifle"),
      active: "pistol" as const,
      readyAt: tick + weapons.pistol.equipTicks,
    },
  };
}
