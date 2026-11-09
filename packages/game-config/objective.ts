import type { Player } from "./movement";
import type { Team } from "./combat";
import { movement } from "./settings";

export const objectiveRules = {
  plantTicks: 5 / movement.tick,
  defuseTicks: 10 / movement.tick,
  fuseTicks: 40 / movement.tick,
  defuseRadius: 2,
};
export const objectiveSites = [
  { id: "A", x: 8, z: -16, radius: 2 },
  { id: "B", x: -10, z: 8, radius: 2 },
] as const;
export type ObjectiveState = {
  carrier: string | null;
  site: string | null;
  position: { x: number; y: number; z: number } | null;
  defused: boolean;
  action: {
    actor: string;
    kind: "plant" | "defuse";
    site: string;
    startedAt: number;
  } | null;
};
export type ObjectiveActor = {
  id: string;
  team: Team;
  health: number;
  player: Player;
  interact: boolean;
};
export function createObjective(carrier: string | null): ObjectiveState {
  return { carrier, site: null, position: null, defused: false, action: null };
}
export function siteAt(player: Player) {
  return objectiveSites.find(
    (site) =>
      Math.abs(player.x - site.x) <= site.radius &&
      Math.abs(player.z - site.z) <= site.radius &&
      Math.abs(player.y) < 0.15,
  );
}
export function advanceObjective(
  state: ObjectiveState,
  tick: number,
  phase: string,
  actors: ObjectiveActor[],
  rules = objectiveRules,
): ObjectiveState {
  if (state.defused || (phase !== "active" && phase !== "planted"))
    return state.action ? { ...state, action: null } : state;
  const actor = actors.find((a) => {
    if (
      !a.interact ||
      a.health <= 0 ||
      !a.player.grounded ||
      Math.hypot(a.player.vx, a.player.vz) > 0.15
    )
      return false;
    if (phase === "active")
      return (
        !state.position &&
        a.team === "Attackers" &&
        a.id === state.carrier &&
        !!siteAt(a.player)
      );
    return (
      a.team === "Defenders" &&
      !!state.position &&
      Math.hypot(
        a.player.x - state.position.x,
        a.player.y - state.position.y,
        a.player.z - state.position.z,
      ) <= rules.defuseRadius
    );
  });
  if (!actor) return state.action ? { ...state, action: null } : state;
  const kind = phase === "active" ? "plant" : "defuse";
  const site = kind === "plant" ? siteAt(actor.player)!.id : state.site!;
  const action: NonNullable<ObjectiveState["action"]> =
    state.action?.actor === actor.id &&
    state.action.kind === kind &&
    state.action.site === site
      ? state.action
      : { actor: actor.id, kind, site, startedAt: tick };
  const duration = kind === "plant" ? rules.plantTicks : rules.defuseTicks;
  if (tick - action.startedAt < duration)
    return action === state.action ? state : { ...state, action };
  if (kind === "defuse") return { ...state, defused: true, action: null };
  return {
    ...state,
    carrier: null,
    site,
    position: { x: actor.player.x, y: actor.player.y, z: actor.player.z },
    action: null,
  };
}
