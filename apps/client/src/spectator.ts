import { objectiveSites, type RoundState } from "@dp/game-config";

export const spectatorViews = ["auto", "foundry", "A", "B"] as const;
export type SpectatorView = (typeof spectatorViews)[number];
export const spectatorViewLabels: Record<SpectatorView, string> = {
  auto: "Auto",
  foundry: "Foundry",
  A: "Site A",
  B: "Site B",
};
export function spectatorPose(
  round: RoundState | undefined,
  health: number,
  view: SpectatorView,
) {
  if (
    !round ||
    health > 0 ||
    !["active", "planted", "ending"].includes(round.phase)
  )
    return null;
  const objective = round.objective?.position;
  const site = objectiveSites.find((s) => s.id === view);
  const focus =
    view === "auto" && objective
      ? objective
      : site
        ? { x: site.x, y: 0, z: site.z }
        : null;
  return focus
    ? {
        position: { x: focus.x, y: focus.y + 16, z: focus.z - 10 },
        target: { x: focus.x, y: focus.y, z: focus.z },
        label:
          view === "auto"
            ? "Watching objective at Site " + round.objective!.site
            : "Watching Site " + view,
      }
    : {
        position: { x: 0, y: 42, z: -34 },
        target: { x: 0, y: 0, z: -2 },
        label: "Watching Foundry",
      };
}
